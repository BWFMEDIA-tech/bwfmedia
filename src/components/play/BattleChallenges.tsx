import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Swords, Check, X, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedImg } from "@/components/ui/signed-img";
import { BATTLE_GENRES } from "@/lib/battle-genres";
import { getArtistsDirectory } from "@/lib/artists-directory.functions";
import {
  submitBattleChallenge,
  listMyBattleChallenges,
  respondBattleChallenge,
  cancelBattleChallenge,
} from "@/lib/battle-challenges.functions";
import { supabase } from "@/integrations/supabase/client";

type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  genre: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  challenger_name: string;
  challenger_avatar: string | null;
  challenged_name: string;
  challenged_avatar: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  accepted: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  scheduled: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  live: "bg-red-500/15 text-red-300 border-red-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  declined: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
      {status}
    </span>
  );
}

function ArtistAvatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
      {url ? (
        <SignedImg src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/** Artist-facing challenge composer + sent/received challenge list. */
export function BattleChallenges({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const submit = useServerFn(submitBattleChallenge);
  const respond = useServerFn(respondBattleChallenge);
  const cancel = useServerFn(cancelBattleChallenge);

  const [search, setSearch] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [genre, setGenre] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const { data: artists } = useQuery({
    queryKey: ["artists-directory"],
    queryFn: () => getArtistsDirectory(),
    staleTime: 60_000,
  });

  const { data: mine, refetch } = useQuery({
    queryKey: ["my-battle-challenges"],
    queryFn: () => listMyBattleChallenges(),
  });

  // Realtime: keep statuses in sync.
  useEffect(() => {
    const channel = supabase
      .channel(`battle-challenges-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_challenges" }, () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["host-battle-challenges"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, queryClient]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (artists ?? [])
      .filter((a) => a.id !== userId)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [artists, search, userId]);

  const challenges = (mine?.challenges ?? []) as Challenge[];
  const received = challenges.filter((c) => c.challenged_id === userId && c.status === "pending");
  const sent = challenges.filter((c) => c.challenger_id === userId);

  const onSubmit = async () => {
    if (!selectedArtist || !genre) return;
    setBusy(true);
    try {
      await submit({ data: { challengedId: selectedArtist, genre: genre as (typeof BATTLE_GENRES)[number] } });
      toast.success("Challenge sent to the host queue");
      setSelectedArtist(null);
      setGenre("");
      setSearch("");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send challenge");
    } finally {
      setBusy(false);
    }
  };

  const onRespond = async (id: string, accept: boolean) => {
    try {
      await respond({ data: { challengeId: id, accept } });
      toast.success(accept ? "Challenge accepted" : "Challenge declined");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not respond");
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancel({ data: { challengeId: id } });
      toast.success("Challenge cancelled");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not cancel");
    }
  };

  return (
    <div className="space-y-4">
      {/* Challenge composer */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold">Challenge an artist</h3>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists…"
          className="mb-2"
        />
        {search.trim() && (
          <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
            {matches.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No artists found.</p>}
            {matches.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelectedArtist(a.id);
                  setSearch(a.name);
                }}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition-colors ${
                  selectedArtist === a.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-transparent hover:bg-muted"
                }`}
              >
                <ArtistAvatar url={a.avatarUrl} name={a.name} />
                <span className="truncate font-medium">{a.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a genre…</option>
            {BATTLE_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <Button onClick={onSubmit} disabled={busy || !selectedArtist || !genre} className="sm:w-auto">
            <Swords className="mr-2 h-4 w-4" /> Send challenge
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The challenge goes to the host queue. Both artists must agree before the host can start the battle.
        </p>
      </div>

      {/* Received challenges */}
      {received.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-3 text-sm font-bold">Challenges for you</h3>
          <div className="space-y-2">
            {received.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                <ArtistAvatar url={c.challenger_avatar} name={c.challenger_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.challenger_name}</p>
                  <p className="text-xs text-muted-foreground">{c.genre}</p>
                </div>
                <Button size="sm" onClick={() => onRespond(c.id, true)}>
                  <Check className="mr-1 h-3.5 w-3.5" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => onRespond(c.id, false)}>
                  <X className="mr-1 h-3.5 w-3.5" /> Decline
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent / involved challenges */}
      {sent.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h3 className="mb-3 text-sm font-bold">Your challenges</h3>
          <div className="space-y-2">
            {sent.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                <ArtistAvatar url={c.challenged_avatar} name={c.challenged_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">vs {c.challenged_name}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.genre}
                    {c.scheduled_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.scheduled_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={c.status} />
                {["pending", "accepted", "scheduled"].includes(c.status) && (
                  <Button size="sm" variant="ghost" onClick={() => onCancel(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
