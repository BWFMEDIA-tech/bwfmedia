// Signed OAuth `state` parameter. HMAC-SHA256 over {userId,platform,nonce,ts}.
// Uses SUPABASE_SERVICE_ROLE_KEY as the HMAC secret — server-only, always
// present in this project. State is single-use in intent (we don't persist
// nonces); a 10 minute TTL bounds replay risk.

const TTL_MS = 10 * 60 * 1000;

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing signing secret");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

export async function signOAuthState(payload: {
  userId: string;
  platform: string;
}): Promise<string> {
  const body = { u: payload.userId, p: payload.platform, t: Date.now(), n: crypto.randomUUID() };
  const bodyStr = b64url(new TextEncoder().encode(JSON.stringify(body)));
  const sig = await hmac(bodyStr);
  return `${bodyStr}.${sig}`;
}

export async function verifyOAuthState(
  state: string,
): Promise<{ userId: string; platform: string } | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [bodyStr, sig] = parts;
  const expected = await hmac(bodyStr);
  if (expected.length !== sig.length) return null;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromB64url(bodyStr)));
    if (typeof decoded?.t !== "number" || Date.now() - decoded.t > TTL_MS) return null;
    if (typeof decoded?.u !== "string" || typeof decoded?.p !== "string") return null;
    return { userId: decoded.u, platform: decoded.p };
  } catch {
    return null;
  }
}