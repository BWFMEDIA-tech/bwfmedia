import { createFileRoute } from "@tanstack/react-router";
import { TunevioHome } from "@/components/tunevio/TunevioHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio — Music Streaming, Live Battles & Artist Charts" },
      {
        name: "description",
        content:
          "Stream music from independent artists, watch live battles in the Arena, follow rising talent and climb the charts — only on Tunevio.",
      },
      { property: "og:title", content: "Tunevio — Music Streaming, Live Battles & Artist Charts" },
      {
        property: "og:description",
        content: "Stream music from independent artists, watch live battles in the Arena, follow rising talent and climb the charts — only on Tunevio.",
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
