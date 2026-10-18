import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Search, Sparkles, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArtistStatusBeacon } from "@/components/artist/ArtistStatusBeacon";
import { useAuth } from "@/lib/auth-context";
import { toggleArtistFollow, listFollowedArtistIds } from "@/lib/artist-follows.functions";
import { getArtistsDirectory, type ArtistDirectoryItem } from "@/lib/artists-directory.functions";

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
  component: ArtistsPage,
});

function ArtistsPage() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const artistIds = useMemo(() => artists.map((a) => a.id).sort(), [artists]);
  const idsKey = artistIds.join(",");
  const followedQ = useQuery({
    queryKey: ["artist-follows-mine", idsKey],
    queryFn: () => listFollowedArtistIds({ data: { artistIds } }),
    enabled: isAuthenticated && artistIds.length > 0,
    staleTime: 60_000,
  });
  const followedIds = useMemo(
    () => new Set(followedQ.data?.followedIds ?? []),
    [followedQ.data],
  );

  function setFollowed(artistId: string, next: boolean) {
    queryClient.setQueryData(["artist-follows-mine", idsKey], (old: any) => {
      const current: string[] = old?.followedIds ?? [];
      const followedIds = next
        ? Array.from(new Set([...current, artistId]))
        : current.filter((id) => id !== artistId);
      return { ...(old ?? {}), followedIds };
    });
  }

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
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => (
              <li key={a.id}>
                <ArtistDirectoryCard
                  a={a}
                  following={followedIds.has(a.id)}
                  onFollowed={setFollowed}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ArtistDirectoryCard({
  a,
  following,
  onFollowed,
}: {
  a: ArtistDirectoryItem;
  following: boolean;
  onFollowed: (artistId: string, following: boolean) => void;
}) {
  const { isAuthenticated } = useAuth();
  const toggleFn = useServerFn(toggleArtistFollow);
  const [busy, setBusy] = useState(false);

  async function handleFollow() {
    if (!isAuthenticated) {
      toast.error("Sign in to follow artists");
      return;
    }
    const prev = following;
    setBusy(true);
    onFollowed(a.id, !prev);
    try {
      const res = await toggleFn({ data: { artistId: a.id } });
      onFollowed(a.id, res.following);
      toast.success(res.following ? `Following ${a.name}` : `Unfollowed ${a.name}`);
    } catch (e: any) {
      onFollowed(a.id, prev);
      toast.error(e?.message ?? "Could not update follow");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-border bg-card/40 px-4 pb-5 pt-8 text-center transition hover:border-primary/50">
      <Link to="/artist/$id" params={{ id: a.publicId }} className="group relative">
        <span
          aria-hidden
          className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-primary via-brand-blue to-primary opacity-70 blur-md"
        />
        <span className="relative block h-24 w-24 rounded-full bg-gradient-to-br from-primary via-brand-blue to-primary p-[2px]">
          <Avatar className="h-full w-full">
            <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} className="object-cover" />
            <AvatarFallback className="text-lg font-bold">{a.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <ArtistStatusBeacon userId={a.id} />
        </span>
        {a.featured && (
          <Badge className="absolute -right-1 top-0 gap-1 bg-background/90 text-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> Featured
          </Badge>
        )}
      </Link>
      <Link to="/artist/$id" params={{ id: a.publicId }} className="mt-4 block w-full">
        <h2 className="truncate text-base font-semibold group-hover:text-primary">{a.name}</h2>
        {a.username && <p className="truncate text-xs text-muted-foreground">@{a.username}</p>}
        {a.genres.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{a.genres.slice(0, 3).join(" / ")}</p>
        )}
      </Link>
      <button
        type="button"
        onClick={handleFollow}
        disabled={busy}
        aria-pressed={following}
        className={`follow-pill mt-4 w-full max-w-[9rem] rounded-full px-5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
          following ? "follow-pill-on" : ""
        }`}
      >
        {following ? (
          <>
            <Check className="h-3.5 w-3.5" /> Following
          </>
        ) : (
          "Follow"
        )}
      </button>
    </div>
  );
}