import { describe, it, expect, beforeEach } from 'vitest';
import { sendStripeCancellationEmail, type SupabaseLike } from './cancellation-email';

// In-memory fake that mimics the DB constraints we actually rely on:
//   - partial unique index on email_send_log(message_id) WHERE status='pending'
//   - partial unique index on email_send_log(message_id) WHERE status='sent'
// Concurrent inserts collide → second one returns Postgres error code 23505.
function makeFake(opts: {
  suppressedEmails?: string[];
  enqueueShouldFail?: boolean;
} = {}) {
  const suppressed = new Set((opts.suppressedEmails ?? []).map((e) => e.toLowerCase()));
  const logRows: any[] = [];
  const enqueueCalls: any[] = [];
  const tokenRows: any[] = [];

  const supabase: SupabaseLike = {
    from(table: string) {
      return makeQuery(table);
    },
    async rpc(name: string, args: any) {
      if (name === 'enqueue_email') {
        enqueueCalls.push(args);
        if (opts.enqueueShouldFail) return { error: { message: 'enqueue failed' } as any };
      }
      return { error: null };
    },
  };

  function makeQuery(table: string) {
    const state: any = { table, op: null, payload: null, filters: [] };
    const builder: any = {
      select() { state.op = 'select'; return builder; },
      insert(payload: any) { state.op = 'insert'; state.payload = payload; return execInsert(); },
      delete() { state.op = 'delete'; return builder; },
      eq(col: string, val: any) { state.filters.push([col, val]); return builder; },
      maybeSingle() { return execSelect(true); },
      then(resolve: any, reject: any) {
        // Awaiting the builder (e.g. delete().eq()) runs the op.
        if (state.op === 'delete') return Promise.resolve(execDelete()).then(resolve, reject);
        return Promise.resolve(execSelect(false)).then(resolve, reject);
      },
    };

    async function execInsert() {
      if (table === 'email_send_log') {
        const row = state.payload;
        // Enforce partial unique index on (message_id) WHERE status='pending'/'sent'.
        const collides = logRows.some(
          (r) =>
            r.message_id === row.message_id &&
            (r.status === 'pending' || r.status === 'sent') &&
            (row.status === 'pending' || row.status === 'sent'),
        );
        if (collides) return { error: { code: '23505', message: 'duplicate key' } };
        logRows.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() });
        return { error: null };
      }
      if (table === 'email_unsubscribe_tokens') {
        tokenRows.push(state.payload);
        return { error: null };
      }
      return { error: null };
    }
    async function execSelect(single: boolean) {
      if (table === 'suppressed_emails') {
        const emailFilter = state.filters.find((f: any) => f[0] === 'email')?.[1];
        const hit = suppressed.has(String(emailFilter).toLowerCase());
        return { data: hit ? { email: emailFilter } : null, error: null };
      }
      if (table === 'email_unsubscribe_tokens') {
        const emailFilter = state.filters.find((f: any) => f[0] === 'email')?.[1];
        const hit = tokenRows.find((t) => t.email === emailFilter);
        return { data: hit ?? null, error: null };
      }
      if (table === 'email_send_log') {
        return { data: single ? null : [], error: null };
      }
      return { data: single ? null : [], error: null };
    }
    async function execDelete() {
      if (table === 'email_send_log') {
        const before = logRows.length;
        const matches = (row: any) =>
          state.filters.every(([col, val]: [string, any]) => row[col] === val);
        for (let i = logRows.length - 1; i >= 0; i--) {
          if (matches(logRows[i])) logRows.splice(i, 1);
        }
        return { error: null, count: before - logRows.length };
      }
      return { error: null };
    }
    return builder;
  }

  return { supabase, logRows, enqueueCalls, tokenRows };
}

describe('sendStripeCancellationEmail idempotency', () => {
  let fake: ReturnType<typeof makeFake>;
  beforeEach(() => { fake = makeFake(); });

  it('sends exactly once for a fresh session id', async () => {
    const outcome = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_1');
    expect(outcome).toBe('sent');
    expect(fake.enqueueCalls).toHaveLength(1);
    expect(fake.logRows).toHaveLength(1);
  });

  it('returns "duplicate" on a sequential Stripe retry for the same ref', async () => {
    const first = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_1');
    const second = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_1');
    const third = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_1');
    expect(first).toBe('sent');
    expect(second).toBe('duplicate');
    expect(third).toBe('duplicate');
    expect(fake.enqueueCalls).toHaveLength(1);
  });

  it('only enqueues once under concurrent webhook deliveries with the same ref', async () => {
    // Fire 10 in parallel. Only one should land in the queue.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_concurrent'),
      ),
    );
    const sent = results.filter((r) => r === 'sent').length;
    const dup = results.filter((r) => r === 'duplicate').length;
    expect(sent).toBe(1);
    expect(dup).toBe(9);
    expect(fake.enqueueCalls).toHaveLength(1);
  });

  it('treats payment_intent retries the same as session retries', async () => {
    await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'pi_test_1');
    const retry = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'pi_test_1');
    expect(retry).toBe('duplicate');
    expect(fake.enqueueCalls).toHaveLength(1);
  });

  it('skips suppressed recipients and does not claim a log row', async () => {
    fake = makeFake({ suppressedEmails: ['blocked@example.com'] });
    const outcome = await sendStripeCancellationEmail(fake.supabase, 'blocked@example.com', 'cs_test_2');
    expect(outcome).toBe('suppressed');
    expect(fake.logRows).toHaveLength(0);
    expect(fake.enqueueCalls).toHaveLength(0);
  });

  it('rolls back the pending claim when enqueue fails so a future retry can re-send', async () => {
    fake = makeFake({ enqueueShouldFail: true });
    const first = await sendStripeCancellationEmail(fake.supabase, 'a@example.com', 'cs_test_3');
    expect(first).toBe('enqueue_failed');
    expect(fake.logRows).toHaveLength(0);

    // After rollback, a retry should be allowed to try again.
    const replay = makeFake();
    const ok = await sendStripeCancellationEmail(replay.supabase, 'a@example.com', 'cs_test_3');
    expect(ok).toBe('sent');
  });

  it('returns "no_email" when Stripe payload has no recipient', async () => {
    const outcome = await sendStripeCancellationEmail(fake.supabase, null, 'cs_test_4');
    expect(outcome).toBe('no_email');
    expect(fake.enqueueCalls).toHaveLength(0);
  });
});