import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/artists")({
  head: () => ({
    meta: [
      { title: "Artists — BWF Network" },
      { name: "description", content: "Discover independent artists on BWF Network — browse profiles, stream music, watch live sets, and connect with the creators shaping the next wave of culture." },
      { property: "og:title", content: "Artists — BWF Network" },
      { property: "og:description", content: "Discover independent artists on BWF Network — browse profiles, stream music, watch live sets, and connect with the creators shaping the next wave of culture." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/artists" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/artists" }],
  }),
  component: () => (
    <StudioStub
      icon={Users}
      title="Artists"
      blurb="Browse signed and featured artists across the BWF Network. Profiles, releases, and collabs all in one place."
    />
  ),
});