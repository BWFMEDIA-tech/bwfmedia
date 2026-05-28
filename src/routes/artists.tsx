import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/artists")({
  head: () => ({
    meta: [
      { title: "Artists — BWF Network" },
      { name: "description", content: "Browse and connect with BWF Network artists." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={Users}
      title="Artists"
      blurb="Browse signed and featured artists across the BWF Network. Profiles, releases, and collabs all in one place."
    />
  ),
});