import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('@/lib/email-templates/send-email', () => ({
  sendTemplateEmail: (...args: any[]) => sendMock(...args),
}));

import { sendStripeCancellationEmail, type SupabaseLike } from './cancellation-email';

function makeFake() {
  const rows: any[] = [];
  const supabase: SupabaseLike = {
    from() {
      const filters: [string, any][] = [];
      const b: any = {
        select() { return b; },
        eq(k: string, v: any) { filters.push([k, v]); return b; },
        limit() { return b; },
        async maybeSingle() {
          const hit = rows.find((r) => filters.every(([k, v]) => r[k] === v));
          return { data: hit ?? null, error: null };
        },
        async insert(row: any) { rows.push(row); return { error: null }; },
      };
      return b;
    },
  };
  return { supabase, rows };
}

describe('sendStripeCancellationEmail', () => {
  beforeEach(() => sendMock.mockReset());

  it('returns no_email without an address', async () => {
    const { supabase } = makeFake();
    expect(await sendStripeCancellationEmail(supabase, null, 'x')).toBe('no_email');
  });

  it('sends once and dedupes retries', async () => {
    sendMock.mockResolvedValue({ sent: true });
    const { supabase, rows } = makeFake();
    expect(await sendStripeCancellationEmail(supabase, 'a@b.com', 'cs_1')).toBe('sent');
    expect(await sendStripeCancellationEmail(supabase, 'a@b.com', 'cs_1')).toBe('duplicate');
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(rows[0].status).toBe('sent');
  });

  it('logs suppressed recipients', async () => {
    sendMock.mockResolvedValue({ sent: false, reason: 'recipient_suppressed' });
    const { supabase, rows } = makeFake();
    expect(await sendStripeCancellationEmail(supabase, 'a@b.com', 'cs_2')).toBe('suppressed');
    expect(rows[0].status).toBe('suppressed');
  });

  it('logs failures', async () => {
    sendMock.mockImplementation(async () => { throw new Error('boom'); });
    const { supabase, rows } = makeFake();
    expect(await sendStripeCancellationEmail(supabase, 'a@b.com', 'cs_3')).toBe('send_failed');
    expect(rows[0]).toMatchObject({ status: 'failed', error_message: 'boom' });
  });
});
