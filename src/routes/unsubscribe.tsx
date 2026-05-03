import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { FutureShell, HUDFrame, GOLD } from "@/components/site/FutureShell";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"checking" | "valid" | "already" | "invalid" | "submitting" | "done" | "error">("checking");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function handleConfirm() {
    setState("submitting");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success) setState("done");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <FutureShell label="EMAIL / UNSUBSCRIBE">
      <main className="max-w-xl mx-auto px-6 md:px-10 py-24">
        <HUDFrame className="p-10 text-center">
          {state === "checking" && (
            <>
              <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: GOLD }} />
              <p className="mt-4 font-cond tracking-[0.3em] text-[11px] uppercase text-bone/70">Verifying...</p>
            </>
          )}
          {state === "valid" && (
            <>
              <h1 className="font-display text-4xl uppercase">Unsubscribe?</h1>
              <p className="mt-4 text-bone/75">
                Confirm to stop receiving emails from <span style={{ color: GOLD }}>BWF Media</span>.
              </p>
              <button
                onClick={handleConfirm}
                className="mt-8 inline-flex items-center justify-center px-8 py-3.5 font-cond font-bold tracking-[0.3em] text-xs uppercase"
                style={{ background: GOLD, color: "#000" }}
              >
                Confirm Unsubscribe
              </button>
            </>
          )}
          {state === "submitting" && (
            <>
              <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: GOLD }} />
              <p className="mt-4 font-cond tracking-[0.3em] text-[11px] uppercase text-bone/70">Processing...</p>
            </>
          )}
          {state === "done" && (
            <>
              <Check className="w-10 h-10 mx-auto" style={{ color: GOLD }} />
              <h1 className="mt-4 font-display text-3xl uppercase">Unsubscribed</h1>
              <p className="mt-3 text-bone/75">You won't receive any more emails from us.</p>
            </>
          )}
          {state === "already" && (
            <>
              <Check className="w-10 h-10 mx-auto" style={{ color: GOLD }} />
              <h1 className="mt-4 font-display text-3xl uppercase">Already Unsubscribed</h1>
              <p className="mt-3 text-bone/75">This email is no longer on our list.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <X className="w-10 h-10 mx-auto text-red-500" />
              <h1 className="mt-4 font-display text-3xl uppercase">Invalid Link</h1>
              <p className="mt-3 text-bone/75">This unsubscribe link is invalid or expired.</p>
            </>
          )}
        </HUDFrame>
      </main>
    </FutureShell>
  );
}