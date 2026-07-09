import { Radio, Users, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Participant } from "@/lib/listening-session";

type Props = {
  isHost: boolean;
  hostPresent: boolean;
  listenerCount: number;
  participants: Participant[];
  currentTrackTitle?: string | null;
  currentArtist?: string | null;
  playbackState: "playing" | "paused" | "stopped";
};

/**
 * Compact live panel: host badge, listener count, current track,
 * participant avatars. Purely presentational — the sync engine lives in
 * useListeningSession().
 */
export function ListeningSessionPanel({
  isHost,
  hostPresent,
  listenerCount,
  participants,
  currentTrackTitle,
  currentArtist,
  playbackState,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Radio className={playbackState === "playing" ? "h-4 w-4 text-primary animate-pulse" : "h-4 w-4 text-muted-foreground"} />
          <span className="font-medium">Live session</span>
          {isHost ? (
            <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Host</Badge>
          ) : hostPresent ? (
            <Badge variant="secondary">Listener</Badge>
          ) : (
            <Badge variant="outline">Host offline</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{listenerCount}</span>
        </div>
      </div>

      {currentTrackTitle ? (
        <div className="mb-3">
          <p className="truncate text-sm font-medium">{currentTrackTitle}</p>
          {currentArtist ? (
            <p className="truncate text-xs text-muted-foreground">{currentArtist}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground capitalize">{playbackState}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {participants.slice(0, 12).map((p) => (
          <div key={p.userId} className="relative">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={p.avatarUrl ?? undefined} alt={p.displayName ?? "listener"} />
              <AvatarFallback>{(p.displayName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            {p.role === "host" ? (
              <Crown className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary p-0.5 text-primary-foreground" />
            ) : null}
          </div>
        ))}
        {participants.length > 12 ? (
          <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">+{participants.length - 12}</div>
        ) : null}
      </div>
    </div>
  );
}