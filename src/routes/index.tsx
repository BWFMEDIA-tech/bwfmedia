import { createFileRoute } from "@tanstack/react-router";
import { ArenaHomepage } from "@/components/site/ArenaHomepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio Arena — Live Music Battles, Fans Decide" },
      { name: "description", content: "Tunevio Arena is where artists battle live, fans vote in real time, and winners earn. Watch live battles, discover artists, climb the leaderboard." },
      { property: "og:title", content: "Tunevio Arena — Live Music Battles" },
      { property: "og:description", content: "Where artists battle. Fans decide. Winners earn." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/" }],
  }),
  component: Index,
});

function Index() {
  return <ArenaHomepage />;
}
