import { createFileRoute } from "@tanstack/react-router";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { PwywSalesDashboard } from "@/components/pwyw/PwywSalesDashboard";

export const Route = createFileRoute("/music-sales")({
  head: () => ({ meta: [
    { title: "Pay What You Want Music Sales — Tunevio" },
    { name: "description", content: "Sell singles, EPs, albums and exclusive releases with fan-chosen pricing, and review your Tunevio music sales." },
    { property: "og:title", content: "Pay What You Want Music Sales — Tunevio" },
    { property: "og:description", content: "Manage your Pay What You Want music products, transactions, artist share and Tunevio commission." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MusicSalesPage,
});

function MusicSalesPage() {
  return <ArtistDashboardShell><PwywSalesDashboard /></ArtistDashboardShell>;
}
