import { describe, expect, it, vi } from "vitest";
import { createSessionTokenResolver } from "./session-token";

function client() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "old-token" } } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } }, error: null }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "new-token" } }, error: null }),
  };
}

describe("session token recovery", () => {
  it("refreshes a rejected token before sending a protected request", async () => {
    const auth = client();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect(await createSessionTokenResolver(auth)()).toBe("new-token");
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });
  it("shares one recovery across concurrent requests", async () => {
    const auth = client();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 403 } });
    const resolve = createSessionTokenResolver(auth);
    expect(await Promise.all([resolve(), resolve(), resolve()])).toEqual(["new-token", "new-token", "new-token"]);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });
  it("validates a working token only once", async () => {
    const auth = client();
    const resolve = createSessionTokenResolver(auth);
    expect(await resolve()).toBe("old-token");
    expect(await resolve()).toBe("old-token");
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });
  it("does not fabricate authentication when signed out", async () => {
    const auth = client();
    auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await createSessionTokenResolver(auth)()).toBeNull();
    expect(auth.getUser).not.toHaveBeenCalled();
  });
  it("does not forward a rejected token if recovery fails", async () => {
    const auth = client();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 400 } });
    await expect(createSessionTokenResolver(auth)()).rejects.toThrow("Please sign in again");
  });
  it("does not refresh tokens on a service outage", async () => {
    const auth = client();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
    await expect(createSessionTokenResolver(auth)()).rejects.toThrow("Please try again");
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });
});