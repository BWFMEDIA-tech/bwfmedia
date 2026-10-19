import type { VitePWAOptions } from "vite-plugin-pwa";

/** Static offline help only: no authenticated HTML, media, API or mutation caching. */
export const tunevioPwaOptions: Partial<VitePWAOptions> = {
  strategies: "generateSW",
  filename: "sw.js",
  outDir: "dist/client",
  manifest: false,
  injectRegister: null,
  registerType: "autoUpdate",
  devOptions: { enabled: false },
  workbox: {
    globPatterns: [],
    additionalManifestEntries: [
      { url: "/offline.html", revision: "tunevio-offline-v1" },
      { url: "/icon-192.png", revision: "tunevio-icon-v1" },
    ],
    navigateFallback: undefined,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.mode === "navigate" &&
          !/^\/(?:~oauth|api)(?:\/|$)/.test(url.pathname) &&
          !/^\/offline\.html$/.test(url.pathname),
        handler: "NetworkFirst",
        options: {
          cacheName: "tunevio-navigation-v1",
          // Never persist SSR HTML, including account-specific responses with cookies.
          plugins: [{ cacheWillUpdate: async () => null }],
          precacheFallback: { fallbackURL: "/offline.html" },
        },
      },
      {
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin &&
          !url.search && !request.headers.has("authorization") &&
          /^\/assets\/[\w.-]+-[\w-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "tunevio-static-v1",
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true },
        },
      },
    ],
  },
};