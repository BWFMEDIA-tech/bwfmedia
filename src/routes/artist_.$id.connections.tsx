import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowDownUp, Search, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getArtistFollowStats,
  listFollowConnections,
  listFollowedArtistIds,
  toggleArtistFollow,
} from "@/lib/artist-follows.functions";
import { useAuth } from "@/lib/auth-context";
import { useSignedAvatarUrl } from "@/lib/useSignedAvatar";

const searchSchema = z.object({ tab: z.enum(["followers", "following"]).catch("followers") });

export const Route = createFileRoute("/artist_/$id/connections")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Followers & Following — Tunevio" },
      { name: "description", content: "See who follows this Tunevio artist and who they follow." },
      { property: "og:title", content: "Followers & Following — Tunevio" },
      { property: "og:description", content: "See who follows this Tunevio artist and who they follow." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectionsPage,
});

type Person = { id: string; name: string; username: string | null; avatarUrl: string | null; subtitle: string | null; followedAt: string };

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}

function ConnectionsPage() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  const statsFn = useServerFn(getArtistFollowStats);
  const listFn = useServerFn(listFollowConnections);
  const followedFn = useServerFn(listFollowedArtistIds);
  const toggleFn = useServerFn(toggleArtistFollow);

  const stats = useQuery({ queryKey: ["artist-follow-stats", id], queryFn: () => statsFn({ data: { artistId: id } }) });
  const list = useQuery({
    queryKey: ["follow-connections", id, tab],
    queryFn: () => listFn({ data: { userId: id, kind: tab, limit: 200 } }),
  });
  const people: Person[] = list.data?.people ?? [];
  const ids = people.map((p) => p.id);
  const followed = useQuery({
    queryKey: ["followed-ids", user?.id, ids.join(",")],
    enabled: !!user && ids.length > 0,
    queryFn: () => followedFn({ data: { artistIds: ids } }),
  });
  const followedSet = new Set(followed.data?.followedIds ?? []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const f = term
      ? people.filter((p) => p.name.toLowerCase().includes(term) || (p.username ?? "").toLowerCase().includes(term))
      : people;
    return newestFirst ? f : [...f].reverse();
  }, [people, q, newestFirst]);

  async function onToggle(pid: string) {
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    try {
      await toggleFn({ data: { artistId: pid } });
      qc.invalidateQueries({ queryKey: ["followed-ids"] });
      qc.invalidateQueries({ queryKey: ["artist-follow-stats"] });
      qc.invalidateQueries({ queryKey: ["follow-connections", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update follow");
    }
  }

  const tabs = [
    { key: "followers" as const, label: `${fmt(stats.data?.count ?? 0)} followers` },
    { key: "following" as const, label: `${fmt(stats.data?.followingCount ?? 0)} following` },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/artist/$id", params: { id } }))}
            className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/artist/$id" params={{ id }} className="truncate text-center text-base font-bold">
            Profile
          </Link>
          <span className="h-10 w-10" />
        </div>
        <nav className="grid grid-cols-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              to="/artist/$id/connections"
              params={{ id }}
              search={{ tab: t.key }}
              replace
              className={`border-b-2 py-3 text-center text-sm font-semibold transition ${
                tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="px-4 pt-4">
        <label className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sort by <b className="text-foreground">{newestFirst ? "Newest" : "Oldest"}</b>
          </p>
          <button type="button" aria-label="Change sort order" onClick={() => setNewestFirst((v) => !v)} className="rounded-full p-2 hover:bg-muted">
            <ArrowDownUp className="h-5 w-5" />
          </button>
        </div>

        {list.isLoading ? (
          <ul className="mt-3 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : list.isError ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Couldn't load this list. Pull to refresh and try again.</p>
        ) : shown.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {q ? "No matches." : tab === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/40">
            {shown.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                isSelf={user?.id === p.id}
                isFollowing={followedSet.has(p.id)}
                followsYou={tab === "followers" && user?.id === id}
                onToggle={() => onToggle(p.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function PersonRow({ p, isSelf, isFollowing, followsYou, onToggle }: { p: Person; isSelf: boolean; isFollowing: boolean; followsYou: boolean; onToggle: () => void }) {
  const avatar = useSignedAvatarUrl(p.avatarUrl);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <Link to="/artist/$id" params={{ id: p.id }} className="shrink-0 rounded-full p-[2px]" style={{ background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-blue))" }}>
        <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-background bg-muted">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" loading="lazy" /> : (
            <div className="grid h-full w-full place-items-center text-lg font-bold">{p.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
      </Link>
      <Link to="/artist/$id" params={{ id: p.id }} className="min-w-0">
        <p className="truncate font-semibold">{p.username ? p.username : p.name}</p>
        <p className="truncate text-sm text-muted-foreground">{p.username ? p.name : p.subtitle ?? ""}</p>
      </Link>
      {isSelf ? null : isFollowing ? (
        <Link
          to="/messages"
          search={{ to: p.id }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-muted px-4 text-sm font-semibold hover:brightness-110"
        >
          <Send className="h-3.5 w-3.5" /> Message
        </Link>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          {followsYou ? "Follow back" : "Follow"}
        </button>
      )}
    </li>
  );
}
