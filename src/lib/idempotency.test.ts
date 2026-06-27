import { describe, it, expect, vi } from "vitest";
import { createIdempotencyKey, runIdempotent } from "./idempotency";

function createMockSupabase(initialRows: Array<{ user_id: string; idempotency_key: string; response: any }> = []) {
  const rows = [...initialRows];
  const inserts: any[] = [];

  const from = vi.fn((_table: string) => {
    const builder: any = {
      _filters: {} as Record<string, any>,
      select() {
        return builder;
      },
      eq(col: string, val: any) {
        builder._filters[col] = val;
        return builder;
      },
      maybeSingle: vi.fn(async () => {
        const match = rows.find(
          (r) =>
            r.user_id === builder._filters.user_id &&
            r.idempotency_key === builder._filters.idempotency_key
        );
        return { data: match ? { response: match.response } : null, error: null };
      }),
      insert: vi.fn(async (row: any) => {
        inserts.push(row);
        rows.push(row);
        return { data: row, error: null };
      }),
    };
    return builder;
  });

  return { supabase: { from }, rows, inserts, from };
}

describe("createIdempotencyKey", () => {
  it("formats key as action:entity:user", () => {
    expect(createIdempotencyKey("vote", "battle1", "user1")).toBe("vote:battle1:user1");
  });
});

describe("runIdempotent", () => {
  it("runs handler on first call and stores response", async () => {
    const mock = createMockSupabase();
    const handler = vi.fn(async () => ({ ok: true, value: 42 }));

    const result = await runIdempotent({
      supabase: mock.supabase,
      userId: "u1",
      key: "k1",
      action: "test",
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, value: 42 });
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0]).toMatchObject({
      user_id: "u1",
      idempotency_key: "k1",
      action: "test",
      response: { ok: true, value: 42 },
    });
  });

  it("returns cached response and skips handler on duplicate key", async () => {
    const mock = createMockSupabase([
      { user_id: "u1", idempotency_key: "k1", response: { cached: true } },
    ]);
    const handler = vi.fn(async () => ({ cached: false }));

    const result = await runIdempotent({
      supabase: mock.supabase,
      userId: "u1",
      key: "k1",
      action: "test",
      handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({ cached: true });
    expect(mock.inserts).toHaveLength(0);
  });

  it("runs handler again for a different key", async () => {
    const mock = createMockSupabase([
      { user_id: "u1", idempotency_key: "k1", response: { v: 1 } },
    ]);
    const handler = vi.fn(async () => ({ v: 2 }));

    const result = await runIdempotent({
      supabase: mock.supabase,
      userId: "u1",
      key: "k2",
      action: "test",
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ v: 2 });
  });

  it("scopes cache by user_id (same key, different users runs handler)", async () => {
    const mock = createMockSupabase([
      { user_id: "u1", idempotency_key: "k1", response: { owner: "u1" } },
    ]);
    const handler = vi.fn(async () => ({ owner: "u2" }));

    const result = await runIdempotent({
      supabase: mock.supabase,
      userId: "u2",
      key: "k1",
      action: "test",
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ owner: "u2" });
  });

  it("caches second call after first completes (end-to-end dedupe)", async () => {
    const mock = createMockSupabase();
    const handler = vi.fn(async () => ({ n: Math.random() }));

    const first = await runIdempotent({
      supabase: mock.supabase,
      userId: "u1",
      key: "k1",
      action: "test",
      handler,
    });
    const second = await runIdempotent({
      supabase: mock.supabase,
      userId: "u1",
      key: "k1",
      action: "test",
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});