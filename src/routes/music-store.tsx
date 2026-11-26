import { createFileRoute } from "@tanstack/react-router";
import { PwywStorefront } from "@/components/pwyw/PwywStorefront";

export const Route = createFileRoute("/music-store")({
  head: () => ({ meta: [
    { title: "Pay What You Want Music Store — Tunevio" },
    { name: "description", content: "Buy singles, EPs, albums and exclusive music from independent artists. Choose Your Price from $1 to $10,000 on Tunevio." },
    { property: "og:title", content: "Pay What You Want Music Store — Tunevio" },
    { property: "og:description", content: "Support artists directly with Pay What You Want music, then stream and download your purchases from your Tunevio Library." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MusicStorePage,
});

function MusicStorePage() {
  return <main className="mx-auto min-h-screen max-w-7xl px-4 pb-32 pt-10 sm:px-8">
    <header className="mb-10 max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Tunevio Music Store</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Pay What You Want</h1>
      <p className="mt-4 text-lg text-muted-foreground">Choose Your Price for singles, EPs, albums and exclusive releases. Every amount delivers the same music and directly supports the artist.</p>
      <p className="mt-3 text-sm text-muted-foreground">$1 minimum · $10,000 maximum · 60% artist / 40% Tunevio before fees, refunds, and taxes</p>
    </header>
    <PwywStorefront showEmpty />
  </main>;
}
