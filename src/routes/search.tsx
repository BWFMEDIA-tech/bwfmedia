import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getArtistsDirectory } from "@/lib/artists-directory.functions";

const artistsQuery = queryOptions({
  queryKey: ["artists-directory"],
  queryFn: () => getArtistsDirectory(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — BWF Network" },
      { name: "description", content: "Search artists, live streams, and battles on BWF Network." },
      { property: "og:title", content: "Search — BWF Network" },
      { property: "og:description", content: "Find artists and content across BWF Network." },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/search" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery(artistsQuery);

  const results = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list.slice(0, 24);
    return list
      .filter((a) => {
        const hay = [a.name, a.username ?? "", a.bio ?? "", a.location ?? "", ...(a.genres ?? [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 50);
  }, [data, q]);

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 md:max-w-3xl md:pt-10">
      <h1 className="text-3xl font-black tracking-tight text-foreground">Search</h1>
      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists, genres, cities…"
          className="pl-9 h-12 rounded-2xl"
          autoFocus
        />
      </div>

      <div className="mt-6 flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
        {results.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {q ? "No matches." : "Loading…"}
          </div>
        )}
        {results.map((a) => (
          <Link
            key={a.id}
            to="/artist/$id"
            params={{ id: a.publicId }}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-white/[0.04]"
          >
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
              <AvatarFallback>{a.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground">{a.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {a.location || (a.genres?.[0] ?? "Artist")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}