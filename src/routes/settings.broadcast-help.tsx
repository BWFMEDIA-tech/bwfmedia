import { createFileRoute } from "@tanstack/react-router";
import { HowItWorks, KeyPointsCard } from "@/components/studio/LiveProductionDashboard";
import { MediaEngineProvider } from "@/lib/media-engine/MediaEngineContext";

export const Route = createFileRoute("/settings/broadcast-help")({
  ssr: false,
  head: () => ({ meta: [{ title: "Broadcast Help — BWF Network" }] }),
  component: BroadcastHelpPage,
});

function BroadcastHelpPage() {
  return (
    <MediaEngineProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Broadcast Help</h1>
          <p className="mt-1 text-sm text-white/60">
            Reference for how the Stage, Audio Mixer, and Broadcast layers work together.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <HowItWorks />
          <KeyPointsCard />
        </div>
      </div>
    </MediaEngineProvider>
  );
}