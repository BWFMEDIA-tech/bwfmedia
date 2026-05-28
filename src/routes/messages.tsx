import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — BWF Network" },
      { name: "description", content: "Direct messages with artists, hosts, and your network." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={MessageSquare}
      title="Messages"
      blurb="Direct conversations with artists, guests, and your team — built right into the studio."
    />
  ),
});