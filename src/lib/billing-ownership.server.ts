import type Stripe from 'stripe';

type BillingContext = { userId: string; supabase: any; claims?: { email?: unknown } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = 'Billing access is unavailable for this account.';

/** A trusted subscription mapping or app-written customer metadata proves ownership; email never does. */
export async function verifyBillingCustomer(stripe: Stripe, context: BillingContext, customerId: string, environment: string) {
  if (!UUID.test(context.userId)) throw new Error(DENIED);
  const { data: links, error } = await context.supabase.from('subscriptions')
    .select('user_id').eq('stripe_customer_id', customerId).eq('environment', environment);
  if (error) throw new Error(DENIED);
  // RLS hides other owners' mappings, so check conflicts through a session-scoped boolean RPC.
  const { data: allowed, error: ownershipError } = await context.supabase.rpc('billing_customer_link_allowed', { _customer: customerId, _environment: environment });
  if (ownershipError || allowed !== true) throw new Error(DENIED);
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error(DENIED);
  const owner = customer.metadata['userId'];
  if ((owner && owner !== context.userId) || (links ?? []).some((link: { user_id: string }) => link.user_id !== context.userId)) throw new Error(DENIED);
  if (owner !== context.userId && !(links ?? []).some((link: { user_id: string }) => link.user_id === context.userId)) throw new Error(DENIED);
  return customerId;
}

export async function resolveBillingCustomer(stripe: Stripe, context: BillingContext, environment: string) {
  if (!UUID.test(context.userId)) throw new Error(DENIED);
  const { data: link, error } = await context.supabase.from('subscriptions')
    .select('stripe_customer_id').eq('user_id', context.userId).eq('environment', environment)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(DENIED);
  if (link?.stripe_customer_id) return verifyBillingCustomer(stripe, context, link.stripe_customer_id, environment);
  const found = await stripe.customers.search({ query: `metadata['userId']:'${context.userId}'`, limit: 1 });
  const customer = found.data[0];
  if (customer) return verifyBillingCustomer(stripe, context, customer.id, environment);
  const email = typeof context.claims?.email === 'string' ? context.claims.email : null;
  const created = await stripe.customers.create({ ...(email ? { email } : {}), metadata: { userId: context.userId } });
  return created.id;
}