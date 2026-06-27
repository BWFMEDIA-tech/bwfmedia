import { Link } from "@tanstack/react-router";
import { slugify } from "@/lib/slugify";
import type { SeoArtist, SeoTrack } from "@/lib/seo-public.functions";

export function TrackCard({ track }: { track: SeoTrack }) {
  return (
    <Link
      to="/track/$slug"
      params={{ slug: track.slug }}
      className="group flex gap-3 rounded-lg border border-white/10 bg-black/40 p-3 transition hover:border-white/30"
    >
      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt={`${track.title} cover art`}
          loading="lazy"
          className="h-16 w-16 rounded object-cover"
        />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded bg-gradient-to-br from-fuchsia-500/40 to-cyan-500/40 text-xs text-white/60">
          ♪
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white group-hover:underline">{track.title}</div>
        <div className="truncate text-sm text-white/60">{track.artistName}</div>
        <div className="mt-1 text-xs text-white/40">{track.likeCount} likes · {track.playCount} plays</div>
      </div>
    </Link>
  );
}

export function ArtistCard({ artist }: { artist: SeoArtist }) {
  return (
    <Link
      to="/artist/$slug"
      params={{ slug: artist.slug }}
      className="group block rounded-lg border border-white/10 bg-black/40 p-3 transition hover:border-white/30"
    >
      <div className="flex items-center gap-3">
        {artist.avatarUrl ? (
          <img
            src={artist.avatarUrl}
            alt={`${artist.name} avatar`}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-bold text-white">
            {artist.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold text-white group-hover:underline">{artist.name}</div>
          {artist.genres.length ? (
            <div className="truncate text-xs text-white/50">{artist.genres.slice(0, 3).join(" · ")}</div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function GenreChips({ genres }: { genres: string[] }) {
  if (!genres.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((g) => (
        <Link
          key={g}
          to="/genre/$slug"
          params={{ slug: slugify(g) }}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {g}
        </Link>
      ))}
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle ? <p className="text-sm text-white/50">{subtitle}</p> : null}
    </div>
  );
}