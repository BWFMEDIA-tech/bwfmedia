import { createFileRoute } from "@tanstack/react-router";
import { EventManager } from "@/components/artist/EventManager";

export const Route = createFileRoute("/settings/events")({
  head: () => ({ meta: [
    {title:'Events & Showcases — Tunevio'},
    {name:'description',content:'Manage your artist and label showcases, event dates and flyers on Tunevio.'},
    {property:'og:title',content:'Events & Showcases — Tunevio'},
    {property:'og:description',content:'Manage your artist and label showcases, event dates and flyers on Tunevio.'},
    {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary'},
  ]}),
  component: EventManager,
});