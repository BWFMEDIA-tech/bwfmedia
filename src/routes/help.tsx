import { createFileRoute } from "@tanstack/react-router";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & AI Assistant — TUNEVIO" },
      { name: "description", content: "Ask the Tunevio AI Assistant how to sign up, upload music, go live, join battles and more, with step-by-step guides." },
      { property: "og:title", content: "Help & AI Assistant — TUNEVIO" },
      { property: "og:description", content: "Step-by-step help for artists, hosts and fans on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-72px-64px-env(safe-area-inset-bottom))] max-w-3xl flex-col px-2 py-3 md:h-[calc(100dvh-80px)] md:px-4 md:py-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/40">
        <AssistantChat />
      </div>
    </div>
  );
}
