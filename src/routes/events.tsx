import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — BWF Network" },
      { name: "description", content: "Upcoming BWF Network live events, shows, and listening parties." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={Calendar}
      title="Events"
      blurb="Schedule live shows, listening parties, and podcast sessions. RSVP, set reminders, and grow your audience."
    />
  ),
});