import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { resolveBillingCustomer, verifyBillingCustomer } from './billing-ownership.server';

const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
function fixture(owner: string | null, linked: string | null = null, allowed = true) {
  const customers = {
    search: vi.fn(async () => ({ data: owner ? [{ id: 'cus_owned' }] : [] })),
    retrieve: vi.fn(async () => ({ id: 'cus_owned', metadata: owner ? { userId: owner } : {} })),
    create: vi.fn(async () => ({ id: 'cus_new' })),
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
    expect(f.customers.create).toHaveBeenCalledWith({ email: 'verified-a@example.test', metadata: { userId: a } });
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
});