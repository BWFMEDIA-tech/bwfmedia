import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, MapPin, Clock, ExternalLink, Radio } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { listPublicEvents, type EventRow } from "@/lib/events.functions";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events Calendar — Tunevio" },
      { name: "description", content: "Browse upcoming Tunevio live events, competitions, listening parties and creator sessions." },
      { property: "og:title", content: "Events Calendar — Tunevio" },
      { property: "og:description", content: "Browse upcoming Tunevio live events, competitions, listening parties and creator sessions." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/events" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/events" }],
  }),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center text-muted-foreground">Failed to load events.</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-muted-foreground">Page not found.</div>
  ),
  component: EventsPage,
});

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function EventsPage() {
  const fetchEvents = useServerFn(listPublicEvents);
  const { data: events = [] } = useQuery({
    queryKey: ["public-events"],
    queryFn: () => fetchEvents(),
    staleTime: 60_000,
  });
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const eventDates = useMemo(
    () => events.map((e) => new Date(e.starts_at)),
    [events],
  );

  const selectedEvents = useMemo(() => {
    if (!selected) return [];
    return events.filter((e) => sameDay(new Date(e.starts_at), selected));
  }, [events, selected]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return events.filter((e) => new Date(e.starts_at) >= now).slice(0, 8);
  }, [events]);

  return (
    <div className="swara-events min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <CalendarIcon className="h-3.5 w-3.5" /> EVENTS CALENDAR
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black">Upcoming events</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Live shows, listening parties, competitions and creator sessions on Tunevio.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <section className="swara-event-calendar rounded-lg border border-border bg-card p-3 sm:p-5 w-fit max-w-full">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              modifiers={{ event: eventDates }}
              modifiersClassNames={{
                event: "relative font-bold text-primary after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
              className="pointer-events-auto"
            />
          </section>

          <section className="min-w-0 py-3 sm:py-5">
            <h2 className="text-lg font-semibold text-foreground">
              {selected ? formatDate(selected.toISOString()).toUpperCase() : "PICK A DATE"}
            </h2>
            <div className="mt-3 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events on this date.</p>
              ) : (
                selectedEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">Next up</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet. Check back soon.</p>
            ) : (
              upcoming.map((e) => <EventCard key={e.id} event={e} withDate />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function EventCard({ event, withDate }: { event: EventRow; withDate?: boolean }) {
  const isLive = event.status === "live";
  return (
    <article className="swara-event-row flex min-w-0 items-start gap-4 border-b border-border py-5">
      <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-card">
        <span className="text-xs text-muted-foreground">{new Date(event.starts_at).toLocaleDateString([], { month: "short" })}</span>
        <span className="mt-1 text-2xl font-semibold">{new Date(event.starts_at).getDate()}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">
              {event.event_type}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 font-bold text-primary">
                <Radio className="h-3 w-3" /> LIVE
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-bold leading-tight">{event.title}</h3>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {withDate ? `${formatDate(event.starts_at)} · ` : ""}
              {formatTime(event.starts_at)}
              {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {event.location}
              </span>
            )}
          </div>
        </div>
        {event.link_url && (
          <Button asChild variant="ghost" size="icon" className="shrink-0 text-brand-silver">
          <a
            href={event.link_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${event.title}`}
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          </Button>
        )}
      </div>
    </article>
  );
}