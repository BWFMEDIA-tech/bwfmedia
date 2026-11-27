import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtistEventsSection } from "@/components/artist/ArtistEventsSection";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute('/labels/$labelId/showcases')({
  head: () => ({meta:[
    {title:'Label Showcases & Events — Tunevio'},
    {name:'description',content:'Discover published Tunevio label showcases and upcoming events from their artist roster.'},
    {property:'og:title',content:'Label Showcases & Events — Tunevio'},
    {property:'og:description',content:'Discover published Tunevio label showcases and upcoming events from their artist roster.'},
    {property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},
  ]}),
  component: LabelShowcases,
});
function LabelShowcases() {
  const {labelId} = Route.useParams();
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 pb-32"><h1 className="text-3xl font-semibold">Label showcases</h1><Button asChild variant="ghost" className="mt-3"><Link to="/events">Events calendar</Link></Button><ArtistEventsSection labelId={labelId}/></main>;
}