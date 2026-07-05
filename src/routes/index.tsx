import { createFileRoute } from "@tanstack/react-router";
import { OnePager } from "@/components/site/OnePager";
import { TrendingMerch } from "@/components/merch/TrendingMerch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio | Where Artists Get Seen & Fans Shape the Future of Music" },
      { name: "description", content: "Tunevio is an interactive music ecosystem where independent artists break through the noise. Discover live battles, community voting, exclusive releases, and real-time fan engagement." },
      { property: "og:title", content: "Tunevio | Where Artists Get Seen. Where Fans Shape the Future of Music." },
      { property: "og:description", content: "Discover new music through live artist battles, community voting, exclusive releases, and real-time fan engagement." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <OnePager />
      <div className="bg-black text-white"><TrendingMerch /></div>
    </>
  );
}
