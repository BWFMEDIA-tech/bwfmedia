import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConnectionApiKey } from './stripe.server';

afterEach(() => vi.unstubAllEnvs());
describe('Stripe payment environment isolation', () => {
  it('rejects a live key configured for sandbox', () => {
    vi.stubEnv('STRIPE_TEST_API_KEY','rk_live_fixture_not_a_real_key');
    expect(() => getConnectionApiKey('sandbox')).toThrow('does not match');
  });
  it('rejects a test key configured for live', () => {
    vi.stubEnv('STRIPE_RESTRICTED_API_KEY','rk_test_fixture_not_a_real_key');
    expect(() => getConnectionApiKey('live')).toThrow('does not match');
  });
  it('selects separate configured live and sandbox keys', () => {
    vi.stubEnv('STRIPE_RESTRICTED_API_KEY','rk_live_fixture_not_a_real_key');
    vi.stubEnv('STRIPE_TEST_API_KEY','rk_test_fixture_not_a_real_key');
    expect(getConnectionApiKey('live')).toBe('rk_live_fixture_not_a_real_key');
    expect(getConnectionApiKey('sandbox')).toBe('rk_test_fixture_not_a_real_key');
  });
});