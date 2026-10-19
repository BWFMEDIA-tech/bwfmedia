/** Refuse app-shell workers in development, editor previews and kill-switch URLs. */
export function shouldRegisterPwa({ production, framed, hostname, search }: {
  production: boolean; framed: boolean; hostname: string; search: string;
}) {
  const previewDomains = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return production && !framed &&
    !/^(id-preview--|preview--)/.test(hostname) &&
    !previewDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) &&
    new URLSearchParams(search).get("sw") !== "off";
}

export async function registerTunevioPwa() {
  if (!("serviceWorker" in navigator)) return;
  const allowed = shouldRegisterPwa({
    production: import.meta.env.PROD,
    framed: window.self !== window.top,
    hostname: window.location.hostname,
    search: window.location.search,
  });
  if (!allowed) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      return worker && new URL(worker.scriptURL).origin === window.location.origin &&
        new URL(worker.scriptURL).pathname === "/sw.js";
    }).map((registration) => registration.unregister()));
    return;
  }
  // The only registrar. No forced reload: preserve music, uploads and live sessions.
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await registration.update();
}