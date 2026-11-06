import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerOnlyFn: (fn: unknown) => fn }));
import { vapidFromSeed } from "./web-push.server";
import { buildPushPayload } from "@block65/webcrypto-web-push";

describe("VAPID and encryption", () => {
  it("derives stable valid P256 keys and produces RFC8291 payloads", async () => {
    // Synthetic test seed, never a configured credential.
    const keys = await vapidFromSeed("test-only-not-a-production-secret");
    const same = await vapidFromSeed("test-only-not-a-production-secret");
    expect(keys.publicKey === same.publicKey).toBe(true);
    const recipient = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", recipient.publicKey));
    const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const payload = await buildPushPayload({ data: { title: "TUNEVIO", link: "/play" }, options: { ttl: 3600 } }, { endpoint: "https://web.push.apple.com/test", expirationTime: null, keys: { p256dh: b64(raw), auth: b64(crypto.getRandomValues(new Uint8Array(16))) } }, keys);
    expect(payload.headers["content-encoding"]).toBe("aes128gcm");
    expect(payload.headers.ttl).toBe("3600");
    expect(payload.body.byteLength).toBeGreaterThan(86);
    expect(payload.headers.authorization.startsWith("vapid ")).toBe(true);
  });
});