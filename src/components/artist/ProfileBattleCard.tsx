import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { getArtistBattleStatus, type ArtistBattleEntry } from "@/lib/artist-battle-status.functions";
import { SignedImg } from "@/components/ui/signed-img";
import logoAsset from "@/assets/tunevio-logo.png.asset.json";

const battleStatusOptions = (id: string) =>
  queryOptions({
    queryKey: ["artist-battle-status", id],
    queryFn: () => getArtistBattleStatus({ data: { id } }),
    staleTime: 15_000,
    retry: false,
  });

function kindLabel(b: ArtistBattleEntry): string {
  return b.kind === "freestyle" ? "Freestyle Battle" : "1v1 Battle";
}

function statusLabel(b: ArtistBattleEntry): string {
  if (b.status === "live") return "LIVE";
  if (b.status === "scheduled") return "SCHEDULED";
  if (b.status === "accepted") return "ACCEPTED";
  return b.direction === "sent" ? "SENT" : "AWAITING REPLY";
}

function detailLabel(b: ArtistBattleEntry): string {
  const parts = [kindLabel(b)];
  if (b.genre) parts.push(b.genre);
  if (b.kind === "freestyle" && b.slotNumber) parts.push(`Slot ${b.slotNumber}`);
  if (b.status === "scheduled" && b.scheduledAt) {
    parts.push(new Date(b.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
  }
  return parts.join(" · ");
}

/**
 * "Who is this artist battling?" strip shown above the profile's tracks.
 * Lists the artist's pending, accepted, scheduled and live matchups from both
 * the 1v1 song-battle queue and the freestyle queue, each linking to the
 * opponent's profile. Renders nothing when there is no active battle.
 */
export function ProfileBattleCard({ artistId }: { artistId: string }) {
  // Deliberately a plain query: a battle-status failure must never take the
  // whole profile page down, so this card just renders nothing instead.
  const { data, isPending, isError } = useQuery(battleStatusOptions(artistId));
  const battles = data?.battles ?? [];
  if (isPending || isError || battles.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="Battles">
      <div className="mb-4 flex items-center gap-2">
        <Swords className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-base font-semibold">Battles</h2>
      </div>
      <ul className="space-y-3">
        {battles.map((b) => (
          <li key={`${b.kind}-${b.id}`} className="fsq-slot p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="fsq-ring">
                <SignedImg src={b.opponent.avatar ?? logoAsset.url} alt={b.opponent.name} />
              </span>
              <div className="min-w-0 flex-1">
                <Link to="/artist/$id" params={{ id: b.opponent.id }} className="fsq-name truncate hover:text-primary">
                  {b.opponent.name}
                </Link>
                <span className="fsq-genre truncate">{detailLabel(b)}</span>
              </div>
              <span className="fsq-vs" aria-hidden>VS</span>
              <span className="fsq-status shrink-0" data-status={b.status === "live" ? "live" : undefined}>
                {statusLabel(b)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
