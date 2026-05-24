import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FutureShell, HUDFrame, GOLD, GOLD_GLOW } from "@/components/site/FutureShell";
import { getLiveSubmissionBySession } from "@/lib/live-submission-checkout.functions";
import { LIVE_TIERS } from "@/lib/live-review-tiers";

export const Route = createFileRoute("/live-review/success")({
  head: () => ({
    meta: [
      { title: "Submission Complete — BWFMEDIA Live Review" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: SuccessPage,
});

type Submission = Awaited<ReturnType<typeof getLiveSubmissionBySession>>;

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!session_id) {
      setPolling(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < 15) {
        attempts++;
        try {
          const row = await getLiveSubmissionBySession({ data: { sessionId: session_id! } });
          if (cancelled) return;
          if (row) {
            setSubmission(row);
            if (row.status === "paid") {
              setPolling(false);
              return;
            }
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setPolling(false);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  const tier = submission?.tier
    ? LIVE_TIERS[`live_review_${submission.tier}` as keyof typeof LIVE_TIERS]
    : null;

  return (
    <FutureShell>
      <div className="relative z-10 mx-auto max-w-2xl px-4 md:px-6 py-16 md:py-24">
        <HUDFrame className="p-6 md:p-10 text-center">
          {polling && submission?.status !== "paid" ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: GOLD }} />
              <h1 className="font-anton text-3xl uppercase mt-5 text-bone">
                Confirming payment…
              </h1>
              <p className="text-bone/70 mt-2 text-sm">
                Hang tight — Stripe is finalizing your submission.
              </p>
            </>
          ) : submission?.status === "paid" ? (
            <>
              <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: GOLD }} />
              <div
                className="inline-block mt-4 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] border"
                style={{ borderColor: `${GOLD}66`, color: GOLD }}
              >
                {tier?.name ?? "Submission"} Confirmed
              </div>
              <h1 className="font-anton text-3xl md:text-4xl uppercase mt-4 text-bone">
                You're In The{" "}
                <span
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_GLOW}, ${GOLD})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Queue
                </span>
              </h1>
              <p className="text-bone/70 mt-3 text-sm md:text-base">
                Thanks, <span className="text-bone">{submission.artist_name}</span>. We'll reach
                out at <span className="text-bone">{submission.email}</span> with your live
                review slot.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/live-review"
                  className="px-5 py-3 font-anton uppercase tracking-wide text-black"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_GLOW}, ${GOLD})`,
                    boxShadow: `0 0 18px ${GOLD}55`,
                  }}
                >
                  Back to Live Room
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-anton text-2xl uppercase text-bone">No submission found</h1>
              <p className="text-bone/70 mt-2 text-sm">
                We couldn't match this session. If you were just charged, your submission will
                appear shortly — try refreshing.
              </p>
              <Link
                to="/live-review"
                className="inline-block mt-6 px-5 py-3 font-anton uppercase tracking-wide text-black"
                style={{ background: GOLD }}
              >
                Back to Live Room
              </Link>
            </>
          )}
        </HUDFrame>
      </div>
    </FutureShell>
  );
}