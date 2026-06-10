import { createFileRoute } from "@tanstack/react-router";
import { GrowthShowcase } from "@/components/site/GrowthShowcase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BWF Media" },
      { name: "description", content: "Live growth dashboard: platform stats, audience reach, and partner network for BWF Media." },
      { property: "og:title", content: "Dashboard — BWF Media" },
      { property: "og:description", content: "Live growth dashboard for BWF Media." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <main className="min-h-screen bg-black text-bone pt-20">
      <GrowthShowcase />
    </main>
  );
}