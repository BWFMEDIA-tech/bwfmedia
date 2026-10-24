import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mic2 } from "lucide-react";
import { getHomeFeed, type FeedArtist } from "@/lib/home-feed.functions";
import { SignedImg } from "@/components/ui/signed-img";

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function ArtistTile({ artist, tabbable = true }: { artist: FeedArtist; tabbable?: boolean }) {
  return (
    <Link
      to="/artist/$id"
      params={{ id: artist.id }}
      tabIndex={tabbable ? undefined : -1}
      className="artist-marquee-card group flex w-44 shrink-0 flex-col items-center rounded-2xl border border-border bg-card px-4 py-6 text-center transition-colors hover:border-primary/50 sm:w-52"
    >
      <span className="relative block h-20 w-20 overflow-hidden rounded-full border border-border bg-secondary sm:h-24 sm:w-24">
        {artist.avatarUrl ? (
          <SignedImg
            src={artist.avatarUrl}
            alt={`${artist.name} profile photo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Mic2 className="h-8 w-8 text-muted-foreground" />
          </span>
        )}
      </span>
      <span className="mt-4 block w-full truncate text-base font-bold text-foreground">
        {artist.name}
      </span>
      <span className="mt-1 block w-full truncate text-xs text-muted-foreground">
        {artist.genres[0] ?? "Artist"} · {formatListeners(artist.monthlyListeners)} listeners
      </span>
    </Link>
  );
}

/**
 * Slow left-to-right infinite scroll highlighting real Tunevio artists.
 * The list is rendered twice so the marquee keyframe (translateX 0 → -50%)
 * loops seamlessly; the duplicate is hidden from assistive tech.
 */
export function ArtistMarquee() {
  const feed = useQuery({ queryKey: ["home-feed"], queryFn: () => getHomeFeed(), staleTime: 60_000 });
  const artists = (feed.data?.artists ?? []).slice(0, 12);
  if (artists.length < 2) return null;
  return (
    <section className="relative pb-24" aria-labelledby="artist-marquee-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-10">
        <h2 id="artist-marquee-heading" className="text-center text-3xl sm:text-4xl font-bold tracking-normal">
          Meet the <span className="text-primary">Artists</span>
        </h2>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Real independent artists building their sound on Tunevio right now.
        </p>
      </div>
      <div className="artist-marquee-viewport mt-10 overflow-hidden" role="presentation">
        <div className="artist-marquee flex w-max gap-4 pr-4">
          {artists.map((a) => (
            <ArtistTile key={a.id} artist={a} />
          ))}
          <span aria-hidden="true" className="contents">
            {artists.map((a) => (
              <ArtistTile key={`dup-${a.id}`} artist={a} tabbable={false} />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
