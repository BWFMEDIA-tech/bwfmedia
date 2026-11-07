import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Swords, Check, X, Calendar, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedImg } from "@/components/ui/signed-img";
import { StatusBadge } from "@/components/play/BattleChallenges";
import {
  listHostBattleChallenges,
  declineBattleChallenge,
  scheduleBattleChallenge,
  startBattleChallenge,
} from "@/lib/battle-challenges.functions";
import { supabase } from "@/integrations/supabase/client";

type HostChallenge = {
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

const TABS = ["pending", "accepted", "scheduled", "live", "completed", "declined"] as const;

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
      {url ? (
        <SignedImg src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-muted-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/** Host battle management: review, schedule and start artist challenges. */
export function ArtistChallengesPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const decline = useServerFn(declineBattleChallenge);
  const schedule = useServerFn(scheduleBattleChallenge);
  const start = useServerFn(startBattleChallenge);

  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["host-battle-challenges", tab],
    queryFn: () => listHostBattleChallenges({ data: { status: tab } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`host-challenges-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_challenges" }, () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["host-battle-challenges"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, queryClient]);

  const challenges = (data?.challenges ?? []) as HostChallenge[];

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const onStart = (c: HostChallenge) =>
    run(c.id, async () => {
      const res = (await start({ data: { challengeId: c.id } })) as { roomName?: string | null };
      if (res?.roomName) {
        navigate({ to: "/play/$room", params: { room: res.roomName } });
      }
    }, "Battle is live in the Arena");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-bold">Artist Challenges</h3>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
              tab === t ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {challenges.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No {tab} challenges.
        </p>
      )}

      <div className="space-y-2">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Avatar url={c.challenger_avatar} name={c.challenger_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {c.challenger_name} <span className="text-muted-foreground">vs</span> {c.challenged_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {c.genre} · {new Date(c.created_at).toLocaleDateString()}
                  {c.scheduled_at && ` · ${new Date(c.scheduled_at).toLocaleString()}`}
                </p>
              </div>
              <Avatar url={c.challenged_avatar} name={c.challenged_name} />
              <StatusBadge status={c.status} />
            </div>

            {["pending", "accepted", "scheduled"].includes(c.status) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {c.status !== "pending" && (
                  <Button size="sm" disabled={busyId === c.id} onClick={() => onStart(c)}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Start battle
                  </Button>
                )}
                {c.status !== "pending" && <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === c.id}
                  onClick={() => {
                    setScheduleFor(scheduleFor === c.id ? null : c.id);
                    setScheduleAt("");
                  }}
                >
                  <Calendar className="mr-1 h-3.5 w-3.5" /> Schedule
                </Button>}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === c.id}
                  onClick={() => run(c.id, () => decline({ data: { challengeId: c.id } }), "Challenge declined")}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Decline
                </Button>
              </div>
            )}

            {c.status === "pending" && (
              <p className="mt-1.5 text-[11px] text-amber-300/80">
                Waiting for {c.challenged_name} to accept before this can start.
              </p>
            )}

            {scheduleFor === c.id && (
              <div className="mt-2 flex items-center gap-1.5">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  disabled={!scheduleAt || busyId === c.id}
                  onClick={() =>
                    run(
                      c.id,
                      () => schedule({ data: { challengeId: c.id, scheduledAt: new Date(scheduleAt).toISOString() } }),
                      "Battle scheduled",
                    ).then(() => setScheduleFor(null))
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
