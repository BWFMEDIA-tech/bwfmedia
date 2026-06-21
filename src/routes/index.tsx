import { createFileRoute } from "@tanstack/react-router";
import { HomeBento } from "@/components/site/HomeBento";
import { TrendingMerch } from "@/components/merch/TrendingMerch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BWF Media TV, Real Content. Real People. Real Views." },
      { name: "description", content: "BWF Media TV, 686M+ views, 324K+ subscribers. Hip-hop media, viral interviews, music videos, and culture. Book a shoot or partner with us." },
      { property: "og:title", content: "BWF Media TV, Where Culture Goes Viral" },
      { property: "og:description", content: "Where culture goes viral. 686M+ views and counting." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfmedia.company/" },
    ],
    links: [{ rel: "canonical", href: "https://bwfmedia.company/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <HomeBento />
      <div className="bg-black text-white"><TrendingMerch /></div>
    </>
  );
}
