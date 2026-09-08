import { createFileRoute } from "@tanstack/react-router";
import { TunevioHome } from "@/components/tunevio/TunevioHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio — Stream Music, Live Battles & Rising Artists" },
      {
        name: "description",
        content:
          "Tunevio is the creator-powered music platform: stream new releases, follow rising artists, watch live battles in the Play Arena and climb the charts.",
      },
      { property: "og:title", content: "Tunevio — Stream Music, Live Battles & Rising Artists" },
      {
        property: "og:description",
        content: "Stream new releases, follow rising artists and watch live battles on Tunevio.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/" }],
  }),
  component: Index,
});

function Index() {
  return <TunevioHome />;
}
