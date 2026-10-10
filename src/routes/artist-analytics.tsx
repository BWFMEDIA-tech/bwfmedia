import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Download, Globe2, Headphones, MapPin, Music2, Users } from "lucide-react";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { StreamingWorldMap } from "@/components/artist/StreamingWorldMap";
import { Button } from "@/components/ui/button";
import { getMyStreamingAnalytics } from "@/lib/artist-analytics.functions";

export const Route = createFileRoute("/artist-analytics")({
  head: () => ({ meta: [
    { title: "Streaming Analytics — Tunevio" },
    { name: "description", content: "Track your Tunevio streams, listeners, locations, and top songs." },
    { property: "og:title", content: "Streaming Analytics — Tunevio" },
    { property: "og:description", content: "Track your Tunevio streams, listeners, locations, and top songs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ArtistAnalyticsPage,
});

const COLORS = ["var(--brand-cyan)", "var(--brand-blue)", "var(--brand-silver)", "var(--primary)", "var(--muted-foreground)"];
const fmt = (value: number) => Number(value || 0).toLocaleString();

function ArtistAnalyticsPage() {
  const [days, setDays] = useState(30);
  const fetchAnalytics = useServerFn(getMyStreamingAnalytics);
  const query = useQuery({ queryKey: ["my-streaming-analytics", days], queryFn: () => fetchAnalytics({ data: { days } }) });
  const data = query.data;
  const summary = data?.summary;
  const hasLocations = !!data?.countries?.some((country) => country.name !== "Unknown");

  const exportCsv = () => {
    if (!data) return;
    const lines = ["date,streams", ...(data?.daily ?? []).map((row) => `${row.date},${row.streams}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tunevio-streams-${days}-days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ArtistDashboardShell>
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Streaming Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">Explore where your music is being streamed around the world.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-card p-1" aria-label="Analytics date range">
              {[7, 30, 90].map((range) => (
                <Button key={range} type="button" size="sm" variant={days === range ? "default" : "ghost"} onClick={() => setDays(range)}>
                  {range} days
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!data}><Download /> Export</Button>
          </div>
        </header>

        {query.isError ? <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Unable to load streaming analytics.</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Total streams" value={fmt(summary?.totalStreams ?? 0)} icon={Headphones} />
          <Metric label="Unique listeners" value={fmt(summary?.uniqueListeners ?? 0)} icon={Users} />
          <Metric label="Countries" value={fmt(summary?.countries ?? 0)} icon={Globe2} />
          <Metric label="Top city" value={summary?.topCity?.name ?? "—"} detail={summary?.topCity?.country} icon={MapPin} />
          <Metric label="Top country" value={summary?.topCountry?.name ?? "—"} detail={summary?.topCountry ? `${fmt(summary.topCountry.streams)} streams` : undefined} icon={Globe2} />
          <Metric label="Top track" value={summary?.topTrack?.name ?? "—"} detail={summary?.topTrack ? `${fmt(summary.topTrack.streams)} streams` : undefined} icon={Music2} />
        </section>

        <Panel className="mt-3" title="Streams by location" action={<span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Last {days} days</span>}>
          <StreamingWorldMap hasLocationData={hasLocations} />
        </Panel>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_1.45fr]">
          <RankingTable title="Streams by country" rows={(data?.countries ?? []).filter((r) => r.name !== "Unknown").map((r) => ({ primary: r.name, value: fmt(r.streams), secondary: `${fmt(r.listeners)} listeners` }))} />
          <RankingTable title="Top cities" rows={(data?.cities ?? []).map((r) => ({ primary: r.name, value: fmt(r.streams), secondary: r.country }))} />
          <Panel title="Streams by region">
            {(data?.regions ?? []).length ? (
              <div className="grid min-h-52 grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)] items-center gap-2">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart><Pie data={data?.regions ?? []} dataKey="streams" nameKey="name" innerRadius="55%" outerRadius="82%" stroke="none">{(data?.regions ?? []).map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-xs">{(data?.regions ?? []).map((region, index) => <div key={region.name} className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{region.name}</span><b>{fmt(region.streams)}</b></div>)}</div>
              </div>
            ) : <Empty />}
          </Panel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel title="Streams over time">
            {(data?.daily ?? []).length ? (
              <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.daily ?? []} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}><XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v) => new Date(`${v}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} /><Line type="monotone" dataKey="streams" stroke="var(--brand-cyan)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--brand-blue)" }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
            ) : <Empty />}
          </Panel>
          <RankingTable title="Top tracks" rows={(data?.tracks ?? []).map((r) => ({ primary: r.title, value: fmt(r.streams), secondary: `${fmt(r.listeners)} listeners` }))} />
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Analytics use recorded Tunevio streams and update as listeners play your music.</p>
      </div>
    </ArtistDashboardShell>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon: typeof Headphones }) {
  return <div className="min-w-0 rounded-md border border-border bg-card p-4"><div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground"><span>{label}</span><Icon className="h-3.5 w-3.5 text-primary" /></div><div className="mt-2 truncate text-xl font-bold text-foreground" title={value}>{value}</div>{detail ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</div> : null}</div>;
}

function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-md border border-border bg-card p-3 ${className}`}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-foreground">{title}</h2>{action}</div>{children}</section>;
}

function RankingTable({ title, rows }: { title: string; rows: Array<{ primary: string; secondary?: string; value: string }> }) {
  return <Panel title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[280px] text-xs"><tbody className="divide-y divide-border">{rows.slice(0, 8).map((row, index) => <tr key={`${row.primary}-${index}`}><td className="w-7 py-2 text-muted-foreground">{index + 1}</td><td className="py-2"><div className="font-medium text-foreground">{row.primary}</div>{row.secondary ? <div className="text-[10px] text-muted-foreground">{row.secondary}</div> : null}</td><td className="py-2 text-right font-semibold text-foreground">{row.value}</td></tr>)}</tbody></table></div> : <Empty />}</Panel>;
}

function Empty() { return <div className="grid min-h-32 place-items-center px-4 text-center text-xs text-muted-foreground">No recorded streams for this period yet.</div>; }