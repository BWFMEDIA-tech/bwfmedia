import { createFileRoute } from "@tanstack/react-router";
import { OnePager } from "@/components/site/OnePager";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

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
    links: [
      { rel: "canonical", href: "https://bwfmedia.company/" },
      // Preload the hero video so the LCP candidate starts fetching with high priority.
      { rel: "preload", as: "video", href: heroRapperVideo.url, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  return <OnePager />;
}
