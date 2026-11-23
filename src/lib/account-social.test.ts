import { describe, expect, it, vi } from "vitest";
import { finishAccountOAuth } from "./account-social";

describe("managed social account continuation", () => {
  it("does not navigate or validate a session until the provider redirect returns", async () => {
    const verify = vi.fn();
    expect(await finishAccountOAuth({ redirected: true }, verify, "/settings/security")).toEqual({ redirected: true });
    expect(verify).not.toHaveBeenCalled();
  });
  it("stops on provider errors before reading any account", async () => {
    const verify = vi.fn();
    await expect(finishAccountOAuth({ error: { message: "Provider declined" } }, verify)).rejects.toThrow("Provider declined");
    expect(verify).not.toHaveBeenCalled();
  });
  it("requires a verified account instead of treating OAuth completion as sign-in", async () => {
    await expect(finishAccountOAuth({}, async () => ({ user: null, error: null }))).rejects.toThrow("Sign-in did not complete");
  });
  it("fails closed on account verification errors even when an ID is present", async () => {
    await expect(finishAccountOAuth({}, async () => ({ user: { id: "existing-artist" }, error: new Error("Expired") }))).rejects.toThrow("Sign-in did not complete");
  });
  it("continues the verified existing account to its same-origin intended page", async () => {
    const user = { id: "existing-artist" };
    const verify = vi.fn(async () => ({ user, error: null }));
    expect(await finishAccountOAuth({}, verify, "/settings/security")).toEqual({ redirected: false, destination: "/settings/security" });
    expect(user.id).toBe("existing-artist");
    expect(verify).toHaveBeenCalledTimes(1);
  });
  it("rejects external redirects without granting roles or creating another account", async () => {
    expect(await finishAccountOAuth({}, async () => ({ user: { id: "existing-listener" }, error: null }), "https://example.com/private")).toEqual({ redirected: false, destination: "/home" });
  });
});