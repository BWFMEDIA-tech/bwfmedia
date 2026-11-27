import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, MapPin, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listProfileEvents } from "@/lib/events.functions";
import { isUpcomingEvent, isSafeEventLink } from "@/lib/profile-events";

export function ArtistEventsSection({ artistId, labelId, isOwner = false }: { artistId?: string; labelId?: string; isOwner?: boolean }) {
  const fetchEvents = useServerFn(listProfileEvents);
  const [history, setHistory] = useState(false);
  const query = useQuery({ queryKey: ['profile-events', artistId, labelId], queryFn: () => fetchEvents({ data: { ...(artistId ? { artistId } : {}), ...(labelId ? { labelId } : {}) } }), staleTime: 30_000 });
  if (!isOwner && !labelId && !query.isError && !query.data?.length) return null;
  const events = (query.data ?? []).filter(e => history ? !isUpcomingEvent(e) : isUpcomingEvent(e));
  if (history) events.reverse();
  return <section className="min-w-0 border-t border-border py-6 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-primary" />Showcases & Events</h2>
      {isOwner && <Button asChild size="sm" variant="outline"><Link to="/settings/events"><Plus className="h-4 w-4" />Add event</Link></Button>}
    </header>
    <div className="my-4 flex gap-2"><Button size="sm" variant={history ? 'ghost' : 'secondary'} onClick={() => setHistory(false)}>Upcoming</Button><Button size="sm" variant={history ? 'secondary' : 'ghost'} onClick={() => setHistory(true)}>Past events</Button></div>
    {query.isError ? <p role="alert" className="text-sm text-destructive">Couldn’t load events. <Button variant="ghost" onClick={() => void query.refetch()}>Retry</Button></p> : query.isPending ? <p className="text-muted-foreground">Loading events…</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">{history ? 'No past events.' : 'No upcoming events.'}</p> :
      <div className="grid gap-4 sm:grid-cols-2">{events.map(event => <article key={event.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
        {event.cover_image_url && <img src={event.cover_image_url} alt={`${event.title} flyer`} className="aspect-[4/3] w-full object-contain bg-background" loading="lazy" />}
        <div className="p-4"><p className="text-xs font-semibold uppercase text-primary">{event.event_type.replaceAll('_', ' ')} · {new Date(event.starts_at).toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'})}</p>
          <h3 className="mt-2 break-words text-lg font-semibold">{event.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</p>
          {event.location && <p className="mt-2 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{event.location}</p>}
          {event.description && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>}
          {event.link_url && isSafeEventLink(event.link_url) && <Button asChild size="sm" className="mt-4"><a href={event.link_url} target="_blank" rel="noopener noreferrer">Tickets / RSVP<ExternalLink className="h-4 w-4" /></a></Button>}
        </div>
      </article>)}</div>}
  </section>;
}