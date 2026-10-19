import { useEffect, useState } from "react";
import { Download, Check, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallTunevio() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    setBusy(true); setError("");
    try { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }
    catch { setError("Installation wasn’t available. Try your browser’s menu below."); }
    finally { setBusy(false); }
  };
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <img src="/icon-192.png" alt="Tunevio app icon" width={88} height={88} className="mb-6" />
      <h1 className="font-display text-4xl text-foreground">Tunevio on your home screen</h1>
      <p className="mt-4 text-muted-foreground">Your music. Your artists. Your stage.</p>
      <div className="my-8">
        {installed ? <p className="flex items-center gap-2 text-primary"><Check size={20} /> You’re using the Tunevio app.</p> :
          prompt ? <Button size="lg" className="min-h-12" onClick={install} disabled={busy}><Download />{busy ? "Opening installation…" : "Install Tunevio"}</Button> :
          <p className="text-sm text-muted-foreground">Open tunevio.com in Safari or Chrome, then follow the steps below.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
      <section className="border-t border-border py-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Share size={20} className="text-primary" /> iPhone & iPad</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>Open tunevio.com in Safari.</li>
          <li>Tap Share, then Add to Home Screen.</li>
          <li>If shown, turn on Open as Web App, then tap Add.</li>
          <li>Launch Tunevio using the new home-screen icon.</li>
        </ol>
      </section>
      <section className="border-t border-border py-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Smartphone size={20} className="text-primary" /> Android</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>Open tunevio.com in Chrome.</li>
          <li>Tap the menu, then Install app or Add to Home screen.</li>
          <li>Confirm, then open Tunevio from your app icon.</li>
        </ol>
      </section>
      <section className="border-t border-border py-6">
        <h2 className="text-xl font-semibold">Desktop</h2>
        <p className="mt-3 text-muted-foreground">In Chrome or Edge, use the install icon in the address bar or the browser’s Install app menu.</p>
      </section>
      <p className="border-t border-border pt-6 text-sm text-muted-foreground">Music, live battles, uploads, payments and account information need an internet connection. Offline, Tunevio shows a reconnect screen, not saved private account information. Installation options vary by browser; links outside Tunevio may open a browser.</p>
    </main>
  );
}