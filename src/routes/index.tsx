import { createFileRoute } from "@tanstack/react-router";
import { TunevioLanding } from "./tunevio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio — The Future of Independent Music" },
      { name: "description", content: "Join Tunevio and use fan engagement, competition, and community to grow your audience. Early access open now." },
      { property: "og:title", content: "Tunevio — The Future of Independent Music" },
      { property: "og:description", content: "Discover music, compete in Play Arena, and support artists. Join the early access waitlist." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/" }],
  }),
  component: Index,
});

function Index() {
  return <TunevioLanding />;
}
