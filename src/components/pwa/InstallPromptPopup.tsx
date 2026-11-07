import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "tunevio-install-prompt-dismissed";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/**
 * One-time "Install Tunevio" welcome popup shown to anyone landing on the
 * site (guests, new members, hosts, visitors). Dismissal is remembered per
 * device; it never shows inside the already-installed app or on /install.
 */
export function InstallPromptPopup() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Private browsing: still offer the popup without persisting dismissal.
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      try {
        window.localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setVisible(true), 3000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible || pathname === "/install") return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") dismiss();
    } catch {
      /* Fall back to the instructions on the install page. */
    } finally {
      setBusy(false);
      setPrompt(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Tunevio"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[70] mx-auto max-w-sm rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-[0_0_32px_rgba(0,230,255,0.25)] backdrop-blur-md md:inset-x-auto md:bottom-6 md:left-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close install message"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={18} />
      </button>
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight text-foreground">Install Tunevio</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Tunevio to your home screen for music, live battles and artist stages — one tap away.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {prompt ? (
              <Button size="sm" className="min-h-10" onClick={install} disabled={busy}>
                <Download size={16} />
                {busy ? "Opening…" : "Install now"}
              </Button>
            ) : (
              <Button size="sm" className="min-h-10" asChild>
                <Link to="/install" onClick={dismiss}>
                  <Download size={16} />
                  How to install
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" className="min-h-10" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
