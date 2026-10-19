import { describe, expect, it } from "vitest";
import { shouldRegisterPwa } from "./pwa";
import { tunevioPwaOptions } from "./pwa-config";

describe("Tunevio PWA safety", () => {
  const published = { production: true, framed: false, hostname: "tunevio.com", search: "" };
  it("registers on the published top-level site only", () => {
    expect(shouldRegisterPwa(published)).toBe(true);
    expect(shouldRegisterPwa({ ...published, production: false })).toBe(false);
    expect(shouldRegisterPwa({ ...published, framed: true })).toBe(false);
  });
  it("blocks every editor preview domain", () => {
    for (const hostname of ["id-preview--abc.lovable.app", "preview--abc.lovable.app", "lovableproject.com", "x.lovableproject.com", "lovableproject-dev.com", "x.lovableproject-dev.com", "beta.lovable.dev", "x.beta.lovable.dev"]) {
      expect(shouldRegisterPwa({ ...published, hostname })).toBe(false);
    }
  });
  it("honors the worker kill switch", () => {
    expect(shouldRegisterPwa({ ...published, search: "?sw=off" })).toBe(false);
  });
  it("precaches only offline help and the public icon", async () => {
    const workbox = tunevioPwaOptions.workbox;
    expect(workbox?.globPatterns).toEqual([]);
    expect(workbox?.additionalManifestEntries).toEqual([
      { url: "/offline.html", revision: "tunevio-offline-v1" },
      { url: "/icon-192.png", revision: "tunevio-icon-v1" },
    ]);
    expect(workbox?.runtimeCaching?.[0]?.handler).toBe("NetworkFirst");
    const hook = workbox?.runtimeCaching?.[0]?.options?.plugins?.[0]?.cacheWillUpdate;
    if (typeof hook !== "function") throw new Error("Missing no-cache HTML hook");
    expect(await hook({ request: new Request("https://tunevio.com/settings"), response: new Response("private"), event: {} as ExtendableEvent })).toBeNull();
  });
  it("bypasses APIs, OAuth, private media, signed URLs and bearer requests", () => {
    const match = (index: number, path: string, mode: RequestMode = "cors", token = false) => {
      const pattern = tunevioPwaOptions.workbox?.runtimeCaching?.[index]?.urlPattern;
      if (typeof pattern !== "function") throw new Error("Missing cache matcher");
      const url = new URL(path, "https://tunevio.com");
      const request = { mode, headers: new Headers(token ? { authorization: "Bearer test" } : {}) } as Request;
      return pattern({ request, url, sameOrigin: true, event: {} as ExtendableEvent });
    };
    expect(match(0, "/settings", "navigate")).toBe(true);
    expect(match(0, "/api/public/payments", "navigate")).toBe(false);
    expect(match(0, "/~oauth/callback", "navigate")).toBe(false);
    expect(match(1, "/assets/player-abcdefgh.js")).toBe(true);
    for (const path of ["/_serverFn/test", "/api/music", "/song.mp3", "/assets/private-abcdefgh.mp4", "/assets/player-abcdefgh.js?token=private"]) expect(match(1, path)).toBe(false);
    expect(match(1, "/assets/player-abcdefgh.js", "cors", true)).toBe(false);
  });
});