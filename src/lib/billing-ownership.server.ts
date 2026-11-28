import type Stripe from 'stripe';

type BillingContext = { userId: string; supabase: any; claims?: { email?: unknown } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = 'Billing access is unavailable for this account.';

/** Only a missing customer may trigger recovery; authorization/network errors must fail closed. */
export function isMissingBillingCustomer(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; raw?: { code?: string; message?: string } };
  return e.code === 'resource_missing' || e.raw?.code === 'resource_missing' ||
    /No such customer\b/i.test(e.raw?.message ?? e.message ?? '');
}

function assertEnvironment(environment: string) {
  if (environment !== 'live' && environment !== 'sandbox') throw new Error(DENIED);
}

function assertCustomerMode(customer: Stripe.Customer, environment: string) {
  if (customer.livemode !== (environment === 'live')) throw new Error(DENIED);
}

/** A trusted subscription mapping or app-written customer metadata proves ownership; email never does. */
export async function verifyBillingCustomer(stripe: Stripe, context: BillingContext, customerId: string, environment: string) {
  assertEnvironment(environment);
  if (!UUID.test(context.userId)) throw new Error(DENIED);
  const { data: links, error } = await context.supabase.from('subscriptions')
    .select('user_id').eq('stripe_customer_id', customerId).eq('environment', environment);
  if (error) throw new Error(DENIED);
  // RLS hides other owners' mappings, so check conflicts through a session-scoped boolean RPC.
  const { data: allowed, error: ownershipError } = await context.supabase.rpc('billing_customer_link_allowed', { _customer: customerId, _environment: environment });
  if (ownershipError || allowed !== true) throw new Error(DENIED);
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw Object.assign(new Error('No such customer'), { code: 'resource_missing' });
  assertCustomerMode(customer, environment);
  const owner = customer.metadata['userId'];
  if ((owner && owner !== context.userId) || (links ?? []).some((link: { user_id: string }) => link.user_id !== context.userId)) throw new Error(DENIED);
  if (owner !== context.userId && !(links ?? []).some((link: { user_id: string }) => link.user_id === context.userId)) throw new Error(DENIED);
  return customerId;
}

export async function resolveBillingCustomer(stripe: Stripe, context: BillingContext, environment: string) {
  assertEnvironment(environment);
  if (!UUID.test(context.userId)) throw new Error(DENIED);
  const { data: link, error } = await context.supabase.from('subscriptions')
    .select('stripe_customer_id').eq('user_id', context.userId).eq('environment', environment)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(DENIED);
  const staleIds = new Set<string>();
  if (link?.stripe_customer_id) {
    try {
      return await verifyBillingCustomer(stripe, context, link.stripe_customer_id, environment);
    } catch (error) {
      if (!isMissingBillingCustomer(error)) throw error;
      staleIds.add(link.stripe_customer_id);
    }
  }
  // Search only the configured Stripe account/mode, by trusted identity, never email.
  for await (const customer of stripe.customers.search({ query: `metadata['userId']:'${context.userId}'`, limit: 100 })) {
    if (staleIds.has(customer.id)) continue;
    try {
      return await verifyBillingCustomer(stripe, context, customer.id, environment);
    } catch (error) {
      if (!isMissingBillingCustomer(error)) throw error;
      staleIds.add(customer.id);
    }
  }
  const email = typeof context.claims?.email === 'string' ? context.claims.email : null;
  // Stripe search is eventually consistent; retries must not create duplicate customers.
  // Stripe scopes idempotency to the configured account and mode.
  const created = await stripe.customers.create(
    { ...(email ? { email } : {}), metadata: { userId: context.userId } },
    { idempotencyKey: `tunevio-billing:${environment}:${context.userId}:${[...staleIds].sort().join(',') || 'new'}` },
  );
  assertCustomerMode(created, environment);
  return verifyBillingCustomer(stripe, context, created.id, environment);
}