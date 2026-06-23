import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Search, MapPin, Sparkles, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getArtistsDirectory } from "@/lib/artists-directory.functions";

const artistsQuery = queryOptions({
  queryKey: ["artists-directory"],
  queryFn: () => getArtistsDirectory(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/artists")({
  head: () => ({
    meta: [
      { title: "Artists — BWF Network" },
      { name: "description", content: "Discover independent artists on BWF Network — browse profiles, stream music, watch live sets, and connect with the creators shaping the next wave of culture." },
      { property: "og:title", content: "Artists — BWF Network" },
      { property: "og:description", content: "Discover independent artists on BWF Network — browse profiles, stream music, watch live sets, and connect with the creators shaping the next wave of culture." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/artists" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/artists" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: ArtistsPage,
});

function ArtistsPage() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    for (const a of artists) for (const g of a.genres) s.add(g);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [artists]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return artists.filter((a) => {
      if (genre && !a.genres.includes(genre)) return false;
      if (!needle) return true;
      return (
        a.name.toLowerCase().includes(needle) ||
        (a.username?.toLowerCase().includes(needle) ?? false) ||
        (a.bio?.toLowerCase().includes(needle) ?? false) ||
        (a.location?.toLowerCase().includes(needle) ?? false) ||
        a.genres.some((g) => g.toLowerCase().includes(needle))
      );
    });
  }, [artists, q, genre]);

  const featuredCount = artists.filter((a) => a.featured).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{artists.length} artists · {featuredCount} featured</span>
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Artists
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse signed and featured artists across the BWF Network. Profiles,
            releases, and collabs all in one place.
          </p>
        </header>

        <div className="sticky top-0 z-10 -mx-4 mb-6 bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search artists by name, username, genre, or location…"
              className="pl-9"
              aria-label="Search artists"
            />
          </div>
          {allGenres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGenre(null)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  genre === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                All genres
              </button>
              {allGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    genre === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              {artists.length === 0
                ? "No artists yet. Check back soon."
                : "No artists match your search."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  to="/artist/$id"
                  params={{ id: a.publicId }}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60 hover:shadow-lg"
                >
                  <div
                    className="relative h-24 w-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/20"
                    style={
                      a.bannerUrl
                        ? { backgroundImage: `url(${a.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : undefined
                    }
                  >
                    {a.featured && (
                      <Badge className="absolute right-2 top-2 gap-1 bg-background/80 text-foreground backdrop-blur">
                        <Sparkles className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                  </div>
                  <div className="-mt-8 px-4 pb-4">
                    <Avatar className="h-16 w-16 border-4 border-card">
                      <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
                      <AvatarFallback>{a.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h2 className="mt-2 truncate text-base font-semibold group-hover:text-primary">
                      {a.name}
                    </h2>
                    {a.username && (
                      <p className="text-xs text-muted-foreground">@{a.username}</p>
                    )}
                    {a.bio && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {a.bio}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {a.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {a.location}
                        </span>
                      )}
                      {a.genres.slice(0, 3).map((g) => (
                        <Badge key={g} variant="secondary" className="text-[10px]">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}