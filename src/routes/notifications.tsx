import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — BWF Network" },
      { name: "description", content: "Activity, mentions, and alerts across BWF Network." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={Bell}
      title="Notifications"
      blurb="Mentions, raised hands, tips, follows, and live alerts — all in one inbox."
    />
  ),
});