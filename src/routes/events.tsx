import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — BWF Network" },
      { name: "description", content: "Catch upcoming BWF Network live events, listening parties, podcast tapings, and DJ sessions — RSVP, set reminders, and never miss a drop from your favorite creators." },
      { property: "og:title", content: "Events — BWF Network" },
      { property: "og:description", content: "Live shows, listening parties, podcast tapings, and DJ sessions on BWF Network. RSVP and set reminders so you never miss a moment." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/events" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/events" }],
  }),
  component: () => (
    <StudioStub
      icon={Calendar}
      title="Events"
      blurb="Schedule live shows, listening parties, and podcast sessions. RSVP, set reminders, and grow your audience."
    />
  ),
});