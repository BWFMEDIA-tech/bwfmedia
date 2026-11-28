import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { isMissingBillingCustomer, resolveBillingCustomer, verifyBillingCustomer } from './billing-ownership.server';

const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
function fixture(owner: string | null, linked: string | null = null, allowed = true) {
  const customers = {
    search: vi.fn(() => ({ async *[Symbol.asyncIterator]() { if (owner) yield { id: 'cus_owned' }; } })),
    retrieve: vi.fn(async (id: string) => ({ id, livemode: true, metadata: id === 'cus_new' ? { userId: a } : owner ? { userId: owner } : {} })),
    create: vi.fn(async () => ({ id: 'cus_new', livemode: true })),
    list: vi.fn(), update: vi.fn(),
  };
  const stripe = { customers } as unknown as Stripe;
  const query: any = {};
  for (const op of ['select','eq','order','limit']) query[op] = vi.fn(() => query);
  query.maybeSingle = async () => ({ data: linked ? { stripe_customer_id: 'cus_owned' } : null, error: null });
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: linked ? [{ user_id: linked }] : [], error: null }).then(resolve);
  const context = { userId: a, claims: { email: 'verified-a@example.test' }, supabase: { from: vi.fn(() => query), rpc: vi.fn(async () => ({ data: allowed, error: null })) } };
  return { customers, stripe, context, query };
}
describe('billing customer ownership', () => {
  it('reuses a customer proven to belong to Artist A', async () => {
    const f = fixture(a); expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_owned');
    expect(f.customers.update).not.toHaveBeenCalled(); expect(f.customers.create).not.toHaveBeenCalled();
  });
  it('rejects Artist B customer metadata even if Artist A supplies its id', async () => {
    const f = fixture(b); await expect(verifyBillingCustomer(f.stripe,f.context,'cus_owned','live')).rejects.toThrow('Billing access');
    expect(f.customers.update).not.toHaveBeenCalled();
  });
  it('never searches email or claims an unowned email-matching customer', async () => {
    const f = fixture(null); expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
    expect(f.customers.list).not.toHaveBeenCalled(); expect(f.customers.update).not.toHaveBeenCalled();
    expect(f.customers.create).toHaveBeenCalledWith({ email: 'verified-a@example.test', metadata: { userId: a } }, { idempotencyKey: `tunevio-billing:live:${a}:new` });
  });
  it('preserves a legacy subscription mapping without changing its customer', async () => {
    const f = fixture(null,a); expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_owned');
    expect(f.customers.create).not.toHaveBeenCalled(); expect(f.customers.update).not.toHaveBeenCalled();
  });
  it('rejects a conflicting owner hidden by ordinary row access', async () => {
    const f = fixture(a,a,false); await expect(resolveBillingCustomer(f.stripe,f.context,'live')).rejects.toThrow('Billing access');
    expect(f.customers.retrieve).not.toHaveBeenCalled();
  });
  it('denies an unlinked customer with no owner metadata', async () => {
    const f = fixture(null); await expect(verifyBillingCustomer(f.stripe,f.context,'cus_owned','live')).rejects.toThrow('Billing access');
  });
  it('fails closed on subscription lookup errors', async () => {
    const f = fixture(a); f.query.maybeSingle = async () => ({ data: null, error: { message: 'failed' } });
    await expect(resolveBillingCustomer(f.stripe,f.context,'live')).rejects.toThrow('Billing access');
    expect(f.customers.create).not.toHaveBeenCalled();
  });
  it('denies missing session identity before touching billing records', async () => {
    const f = fixture(a); await expect(resolveBillingCustomer(f.stripe,{ ...f.context,userId:'' },'live')).rejects.toThrow('Billing access');
    expect(f.context.supabase.from).not.toHaveBeenCalled();
  });
  it('recovers a missing mapped customer after Stripe account reconnection', async () => {
    const f = fixture(a,a);
    f.customers.retrieve.mockRejectedValueOnce({ code: 'resource_missing' });
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
    expect(f.customers.retrieve.mock.calls.map(([id]) => id)).toEqual(['cus_owned','cus_new']);
    expect(f.customers.create).toHaveBeenCalledTimes(1);
  });
  it('recovers No such customer from canceled subscription history without rewriting it', async () => {
    const f = fixture(null,a);
    f.query.maybeSingle = async () => ({ data: { stripe_customer_id: 'cus_old', status: 'canceled' }, error: null });
    f.customers.retrieve.mockRejectedValueOnce({ message: "No such customer: 'cus_old'" });
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
    expect(f.customers.update).not.toHaveBeenCalled();
    expect(f.query.update).toBeUndefined();
  });
  it('reuses a valid current-account metadata customer after a stale mapping', async () => {
    const f = fixture(a,a);
    f.query.maybeSingle = async () => ({ data: { stripe_customer_id: 'cus_old' }, error: null });
    f.customers.retrieve.mockRejectedValueOnce({ raw: { code: 'resource_missing' } });
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_owned');
    expect(f.customers.create).not.toHaveBeenCalled();
  });
  it('skips deleted customers and creates a verified replacement', async () => {
    const f = fixture(a,a);
    f.customers.retrieve.mockResolvedValueOnce({ id: 'cus_owned', deleted: true } as unknown as Awaited<ReturnType<typeof f.customers.retrieve>>);
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
  });
  it('recovers a missing metadata search result rather than returning it', async () => {
    const f = fixture(a);
    f.customers.retrieve.mockRejectedValueOnce({ code: 'resource_missing' });
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
  });
  it.each([{ code: 'api_connection_error' }, { code: 'permission_denied', statusCode: 403 }, { statusCode: 404, message: 'Other resource missing' }])('does not recover unrelated errors %j', async (error) => {
    const f = fixture(a,a); f.customers.retrieve.mockRejectedValueOnce(error);
    await expect(resolveBillingCustomer(f.stripe,f.context,'live')).rejects.toEqual(error);
    expect(f.customers.search).not.toHaveBeenCalled(); expect(f.customers.create).not.toHaveBeenCalled();
  });
  it('rejects a test customer in live mode rather than granting billing access', async () => {
    const f = fixture(a,a);
    f.customers.retrieve.mockResolvedValueOnce({ id: 'cus_owned', livemode: false, metadata: { userId: a } });
    await expect(resolveBillingCustomer(f.stripe,f.context,'live')).rejects.toThrow('Billing access');
    expect(f.customers.create).not.toHaveBeenCalled();
  });
  it('keeps sandbox lookup separate and reuses a valid sandbox customer', async () => {
    const f = fixture(a,a);
    f.customers.retrieve.mockResolvedValueOnce({ id: 'cus_owned', livemode: false, metadata: { userId: a } });
    expect(await resolveBillingCustomer(f.stripe,f.context,'sandbox')).toBe('cus_owned');
    expect(f.query.eq).toHaveBeenCalledWith('environment','sandbox');
    expect(f.query.eq).not.toHaveBeenCalledWith('environment','live');
  });
  it('rejects unsupported environments before any customer lookup', async () => {
    const f = fixture(a);
    await expect(resolveBillingCustomer(f.stripe,f.context,'production')).rejects.toThrow('Billing access');
    expect(f.customers.search).not.toHaveBeenCalled();
  });
  it('does not classify ownership or generic 404 errors as stale customers', () => {
    expect(isMissingBillingCustomer(new Error('Billing access'))).toBe(false);
    expect(isMissingBillingCustomer({ statusCode: 404 })).toBe(false);
    expect(isMissingBillingCustomer(null)).toBe(false);
  });
  it('uses the same account-scoped creation key while Stripe search has not indexed the replacement', async () => {
    const f = fixture(null,a);
    f.customers.retrieve.mockImplementation(async (id) => {
      if (id === 'cus_owned') throw { code: 'resource_missing' };
      return { id, livemode: true, metadata: { userId: a } };
    });
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
    expect(await resolveBillingCustomer(f.stripe,f.context,'live')).toBe('cus_new');
    expect(f.customers.create.mock.calls[0]).toEqual(f.customers.create.mock.calls[1]);
    expect(f.customers.create).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: `tunevio-billing:live:${a}:cus_owned` });
  });
});