import { Link } from "@tanstack/react-router";
import { Heart, MoreHorizontal, Pause, Play, Radio, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SignedImg } from "@/components/ui/signed-img";
import { usePlayer, type PlayerTrack } from "@/lib/player-context";
import type { FeedArtist, FeedBattle, FeedStream, FeedTrack } from "@/lib/home-feed.functions";

/* ── shared helpers ─────────────────────────────────────────────── */

export function toPlayerTrack(t: FeedTrack): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artistName,
    audioUrl: t.audioUrl ?? "",
    coverUrl: t.coverUrl,
    durationSec: t.durationSeconds,
  };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatDuration(sec?: number | null): string {
  if (!sec || !isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Base surface every card variation is built on. */
export function CardShell({
  className,
  children,
  interactive = true,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-tv-line bg-tv-card transition-all duration-300",
        interactive &&
          "hover:border-white/15 hover:bg-tv-card-hover md:hover:-translate-y-1 md:hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] active:bg-tv-active",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Artwork({
  src,
  alt,
  className,
  rounded = "rounded-xl",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-tv-violet/25 via-tv-card to-tv-cyan/20",
        rounded,
        className,
      )}
    >
      {src ? (
        <SignedImg
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white/25">
          {alt.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/** Circular play control — always visible on touch, lifts in on hover. */
export function PlayFab({
  playing,
  onClick,
  size = "md",
  className,
}: {
  playing?: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      aria-label={playing ? "Pause" : "Play"}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-full bg-tv-cyan text-black shadow-lg shadow-tv-cyan/25 transition",
        "hover:scale-105 active:scale-95",
        "md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0",
        dims,
        className,
      )}
    >
      {playing ? <Pause className={cn(icon, "fill-current")} /> : <Play className={cn(icon, "fill-current ml-0.5")} />}
    </button>
  );
}

/* ── MediaCard (generic base) ───────────────────────────────────── */

export type MediaCardProps = {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  shape?: "square" | "circle";
  badge?: ReactNode;
  onPlay?: () => void;
  playing?: boolean;
  to?: string;
  params?: Record<string, string>;
  footer?: ReactNode;
};

export function MediaCard({
  title,
  subtitle,
  imageUrl,
  shape = "square",
  badge,
  onPlay,
  playing,
  to,
  params,
  footer,
}: MediaCardProps) {
  const body = (
    <CardShell className="p-3">
      <div className="relative">
        <Artwork
          src={imageUrl}
          alt={title}
          rounded={shape === "circle" ? "rounded-full" : "rounded-xl"}
          className="aspect-square w-full"
        />
        {badge ? <div className="absolute left-2 top-2">{badge}</div> : null}
        {onPlay ? (
          <div className="absolute bottom-2 right-2">
            <PlayFab
              playing={playing}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay();
              }}
            />
          </div>
        ) : null}
      </div>
      <div className={cn("mt-3", shape === "circle" && "text-center")}>
        <p className="truncate text-sm font-bold text-white">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-white/50">{subtitle}</p> : null}
        {footer}
      </div>
    </CardShell>
  );

  if (to) {
    return (
      <Link to={to as never} params={params as never} className="block">
        {body}
      </Link>
    );
  }
  // No destination: let anyone click/tap the card itself to play.
  if (onPlay) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        onClick={onPlay}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlay();
          }
        }}
        className="block cursor-pointer text-left"
      >
        {body}
      </div>
    );
  }
  return body;
}

/* ── AlbumCard ──────────────────────────────────────────────────── */

export function AlbumCard({
  track,
  queue,
  badge,
}: {
  track: FeedTrack;
  queue?: FeedTrack[];
  badge?: ReactNode;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  return (
    <MediaCard
      title={track.title}
      subtitle={track.artistName}
      imageUrl={track.coverUrl}
      badge={badge}
      playing={isCurrent && player.isPlaying}
      onPlay={() => {
        if (isCurrent) return player.toggle();
        player.play(toPlayerTrack(track), (queue ?? [track]).map(toPlayerTrack));
      }}
    />
  );
}

/* ── TrackCard (compact row) ────────────────────────────────────── */

export function TrackCard({
  track,
  queue,
  index,
}: {
  track: FeedTrack;
  queue?: FeedTrack[];
  index?: number;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  return (
    <CardShell className="flex items-center gap-3 p-2.5">
      {typeof index === "number" ? (
        <span className="w-5 shrink-0 text-center text-sm font-black text-white/30">{index}</span>
      ) : null}
      <Artwork src={track.coverUrl} alt={track.title} className="h-12 w-12 shrink-0" rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
        <p className="truncate text-xs text-white/50">{track.artistName}</p>
      </div>
      <span className="hidden shrink-0 text-xs tabular-nums text-white/40 sm:block">
        {formatDuration(track.durationSeconds)}
      </span>
      <button
        type="button"
        aria-label={isCurrent && player.isPlaying ? "Pause" : "Play"}
        onClick={() => {
          if (isCurrent) return player.toggle();
          player.play(toPlayerTrack(track), (queue ?? [track]).map(toPlayerTrack));
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-tv-cyan hover:text-black"
      >
        {isCurrent && player.isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>
      <button
        type="button"
        aria-label="More options"
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white sm:grid"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </CardShell>
  );
}

/* ── ArtistCard ─────────────────────────────────────────────────── */

export function ArtistCard({
  artist,
  onFollow,
  following,
}: {
  artist: FeedArtist;
  onFollow?: () => void;
  following?: boolean;
}) {
  return (
    <CardShell className="p-3 text-center">
      <Link to="/artist/$id" params={{ id: artist.id }} className="block">
        <Artwork src={artist.avatarUrl} alt={artist.name} rounded="rounded-full" className="aspect-square w-full" />
        <p className="mt-3 truncate text-sm font-bold text-white">{artist.name}</p>
        <p className="mt-0.5 truncate text-xs text-white/50">
          {formatCount(artist.monthlyListeners)} plays
        </p>
      </Link>
      <button
        type="button"
        onClick={onFollow}
        className={cn(
          "mt-3 w-full rounded-full border px-3 py-1.5 text-xs font-bold transition",
          following
            ? "border-tv-cyan/60 bg-tv-cyan/10 text-tv-cyan"
            : "border-white/20 text-white hover:border-white/50 hover:bg-white/5",
        )}
      >
        {following ? "Following" : "Follow"}
      </button>
    </CardShell>
  );
}

/* ── PlaylistCard ───────────────────────────────────────────────── */

export function PlaylistCard({
  title,
  description,
  imageUrl,
  count,
  onPlay,
  to,
}: {
  title: string;
  description?: string;
  imageUrl?: string | null;
  count: number;
  onPlay?: () => void;
  to?: string;
}) {
  const inner = (
    <CardShell className="p-3">
      <div className="relative">
        <Artwork src={imageUrl} alt={title} className="aspect-square w-full" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        {onPlay ? (
          <div className="absolute bottom-2 right-2">
            <PlayFab
              onClick={(e) => {
                e.preventDefault();
                onPlay();
              }}
            />
          </div>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
          {count} songs
        </span>
      </div>
      <p className="mt-3 truncate text-sm font-bold text-white">{title}</p>
      {description ? <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{description}</p> : null}
    </CardShell>
  );
  return to ? (
    <Link to={to as never} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ── LiveArenaCard ──────────────────────────────────────────────── */

export function LiveArenaCard({ battle }: { battle: FeedBattle }) {
  return (
    <CardShell className="p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tv-magenta px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/60">
          <Users className="h-3.5 w-3.5" /> {formatCount(battle.viewers)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-tv-cyan/40 to-transparent text-sm font-black text-white">
          {battle.artistA.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-display text-lg text-tv-magenta">VS</span>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-tv-magenta/40 to-transparent text-sm font-black text-white">
          {battle.artistB.slice(0, 2).toUpperCase()}
        </div>
      </div>

      <p className="mt-3 truncate text-center text-sm font-bold text-white">{battle.title}</p>
      <p className="mt-0.5 text-center text-xs text-white/50">
        Round {battle.currentRound} of {battle.totalRounds}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/mic-drop"
          className="rounded-full border border-white/20 py-2 text-center text-xs font-bold text-white transition hover:bg-white/10"
        >
          Vote
        </Link>
        {battle.roomName ? (
          <Link
            to="/play/$room"
            params={{ room: battle.roomName }}
            className="rounded-full bg-tv-cyan py-2 text-center text-xs font-black text-black transition hover:brightness-110"
          >
            Join Live
          </Link>
        ) : (
          <Link
            to="/mic-drop"
            className="rounded-full bg-tv-cyan py-2 text-center text-xs font-black text-black transition hover:brightness-110"
          >
            Join Live
          </Link>
        )}
      </div>
    </CardShell>
  );
}

/* ── LiveStreamCard ─────────────────────────────────────────────── */

export function LiveStreamCard({ stream }: { stream: FeedStream }) {
  return (
    <Link to="/live" className="block">
      <CardShell className="overflow-hidden">
        <div className="relative aspect-video">
          <Artwork src={stream.thumbnailUrl} alt={stream.title} rounded="rounded-none" className="h-full w-full" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-tv-magenta px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
            <Radio className="h-3 w-3" /> Live
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white/85">
            {formatCount(stream.viewers)} watching
          </span>
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-bold text-white">{stream.title}</p>
          {stream.category ? <p className="mt-0.5 truncate text-xs text-white/50">{stream.category}</p> : null}
        </div>
      </CardShell>
    </Link>
  );
}

/* ── FeaturedCard (hero) ────────────────────────────────────────── */

export function FeaturedCard({
  track,
  queue,
  onSave,
  saved,
}: {
  track: FeedTrack;
  queue?: FeedTrack[];
  onSave?: () => void;
  saved?: boolean;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-tv-line bg-tv-surface">
      <div className="absolute inset-0 bg-gradient-to-br from-tv-violet/35 via-tv-magenta/10 to-tv-cyan/25" />
      <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-center">
        <Artwork
          src={track.coverUrl}
          alt={track.title}
          rounded="rounded-2xl"
          className="aspect-square w-full max-w-[260px] shadow-2xl"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-tv-cyan">Featured on Tunevio</p>
          <h2 className="mt-2 truncate font-display text-3xl leading-tight text-white sm:text-5xl">{track.title}</h2>
          <p className="mt-1 text-sm font-semibold text-white/70">{track.artistName}</p>
          <p className="mt-3 max-w-xl text-sm text-white/55">
            {formatCount(track.playCount)} plays · {formatCount(track.likeCount)} likes · the release everyone on
            Tunevio is spinning right now.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isCurrent) return player.toggle();
                player.play(toPlayerTrack(track), (queue ?? [track]).map(toPlayerTrack));
              }}
              className="inline-flex items-center gap-2 rounded-full bg-tv-cyan px-6 py-3 text-sm font-black text-black transition hover:brightness-110 active:scale-95"
            >
              {isCurrent && player.isPlaying ? (
                <>
                  <Pause className="h-5 w-5 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" /> Play
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition",
                saved ? "border-tv-magenta bg-tv-magenta/15 text-tv-magenta" : "border-white/25 text-white hover:bg-white/10",
              )}
            >
              <Heart className={cn("h-4 w-4", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
            </button>
            {track.artistUserId ? (
              <Link
                to="/artist/$id"
                params={{ id: track.artistUserId }}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                View Artist
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── QuickAccessCard ────────────────────────────────────────────── */

export function QuickAccessCard({
  title,
  imageUrl,
  gradient,
  icon,
  to,
  onClick,
  onPlay,
}: {
  title: string;
  imageUrl?: string | null;
  gradient?: string;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
  onPlay?: () => void;
}) {
  const inner = (
    <div className="group flex items-center gap-3 overflow-hidden rounded-xl border border-tv-line bg-white/[0.06] pr-2 transition hover:bg-white/[0.12] active:bg-tv-active">
      <div
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center overflow-hidden text-white/80",
          gradient ?? "bg-gradient-to-br from-tv-violet to-tv-cyan",
        )}
      >
        {imageUrl ? (
          <SignedImg src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          icon
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</span>
      {onPlay ? (
        <button
          type="button"
          aria-label={`Play ${title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay();
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tv-cyan text-black transition md:opacity-0 md:group-hover:opacity-100"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      ) : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to as never} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="block w-full cursor-pointer text-left"
    >
      {inner}
    </div>
  );
}
