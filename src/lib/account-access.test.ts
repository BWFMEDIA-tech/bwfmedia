import { describe, expect, it, vi } from "vitest";
import { accountErrorMessage, hydrateAccountSession, safeAccountDestination } from "./account-access";

describe("existing account access", () => {
  it("rejects external and backslash redirect destinations", () => {
    expect(safeAccountDestination("//example.com")).toBeUndefined();
    expect(safeAccountDestination("/\\example.com")).toBeUndefined();
    expect(safeAccountDestination("https://example.com")).toBeUndefined();
    expect(safeAccountDestination("/home?tab=music")).toBe("/home?tab=music");
  });
  it("avoids sending successful sign-ins back to sign-in or signup", () => {
    expect(safeAccountDestination("/login?next=/home")).toBeUndefined();
    expect(safeAccountDestination("/signup")).toBeUndefined();
  });
  it("distinguishes unconfirmed email from wrong passwords", () => {
    expect(accountErrorMessage({code:"email_not_confirmed"}, "signin")).toContain("Confirm your email");
    expect(accountErrorMessage({code:"invalid_credentials"}, "signin")).toBe("Incorrect email or password.");
  });
  it("does not misreport service errors as wrong credentials", () => {
    expect(accountErrorMessage({status:503}, "signin")).toContain("temporarily unavailable");
    expect(accountErrorMessage({status:429}, "signup")).toContain("wait");
  });
  it("does not overwrite a new signed-in session with an older initial read", async () => {
    let finish: ((value: string | null) => void) | undefined;
    const apply = vi.fn();
    const state = hydrateAccountSession(() => new Promise<string | null>(resolve => { finish = resolve; }), apply, vi.fn());
    state.onEvent("new-session");
    finish?.(null);
    await Promise.resolve();
    expect(apply.mock.calls).toEqual([["new-session"]]);
  });
  it("ends loading on initial session failure", async () => {
    const failed = vi.fn();
    hydrateAccountSession(() => Promise.reject(new Error("offline")), vi.fn(), failed);
    await Promise.resolve(); await Promise.resolve();
    expect(failed).toHaveBeenCalledOnce();
  });
  it("ignores session reads after unmount", async () => {
    const apply = vi.fn();
    const state = hydrateAccountSession(() => Promise.resolve(null), apply, vi.fn());
    state.dispose();
    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
  });
});