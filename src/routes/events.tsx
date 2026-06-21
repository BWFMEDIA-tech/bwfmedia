import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, MapPin, Clock, ExternalLink, Radio } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { listPublicEvents, type EventRow } from "@/lib/events.functions";

const eventsQuery = queryOptions({
  queryKey: ["public-events"],
  queryFn: () => listPublicEvents(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events Calendar — BWF Network" },
      { name: "description", content: "See all upcoming BWF Network live events, competitions, listening parties, and DJ sessions on the events calendar." },
      { property: "og:title", content: "Events Calendar — BWF Network" },
      { property: "og:description", content: "Browse upcoming BWF Network live events, competitions, and creator sessions on the calendar." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/events" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/events" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center text-white/70">Failed to load events.</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-white/70">Page not found.</div>
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
    ...eventsQuery,
    queryFn: () => fetchEvents(),
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
    <div className="min-h-screen bg-[#05050a] text-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold tracking-widest text-[#00E6FF]">
            <CalendarIcon className="h-3.5 w-3.5" /> EVENTS CALENDAR
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black">Upcoming events</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Every scheduled competition, live show, listening party, and creator session — published by BWF when admins drop a date.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-3 sm:p-5 w-fit">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              modifiers={{ event: eventDates }}
              modifiersClassNames={{
                event: "relative font-bold text-[#00E6FF] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-[#FF00A6]",
              }}
              className="pointer-events-auto"
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5 sm:p-6">
            <h2 className="text-xs font-bold tracking-widest text-white/50">
              {selected ? formatDate(selected.toISOString()).toUpperCase() : "PICK A DATE"}
            </h2>
            <div className="mt-3 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-white/50">No events on this date.</p>
              ) : (
                selectedEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-xs font-bold tracking-widest text-white/50">NEXT UP</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-white/50">Nothing scheduled yet. Check back soon.</p>
            ) : (
              upcoming.map((e) => <EventCard key={e.id} event={e} withDate />)
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function EventCard({ event, withDate }: { event: EventRow; withDate?: boolean }) {
  const isLive = event.status === "live";
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-[#C53DFF]/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="rounded bg-white/5 px-2 py-0.5 font-bold uppercase tracking-wider">
              {event.event_type}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded bg-[#FF00A6]/20 px-2 py-0.5 font-bold text-[#FF00A6]">
                <Radio className="h-3 w-3" /> LIVE
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-bold leading-tight">{event.title}</h3>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/60">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
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
          <a
            href={event.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#C53DFF] to-[#004BFF] px-3 py-1.5 text-xs font-bold hover:shadow-[0_0_20px_-5px_#C53DFF80]"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}