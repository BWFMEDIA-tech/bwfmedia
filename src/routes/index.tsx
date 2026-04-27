import { createFileRoute } from "@tanstack/react-router";
import { Deck } from "@/components/deck/Deck";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BWF Media TV — Pitch Deck | Real Content. Real People. Real Views." },
      { name: "description", content: "BWF Media TV pitch deck. 686M+ views, 324K+ subscribers. Hip-hop media, viral interviews, music videos, and culture." },
      { property: "og:title", content: "BWF Media TV — Pitch Deck" },
      { property: "og:description", content: "Where culture goes viral. 686M+ views and counting." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Deck />;
}
