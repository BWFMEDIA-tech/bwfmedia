import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedImg } from "@/components/ui/signed-img";
import { supabase } from "@/integrations/supabase/client";
import { listHostBattleChallenges, scheduleBattleChallenge } from "@/lib/battle-challenges.functions";

export type ConfirmedMatchup = {
  id: string; challenger_id: string; challenged_id: string; genre: string;
  challenger_name: string; challenged_name: string;
  challenger_avatar: string | null; challenged_avatar: string | null;
  status: string; scheduled_at: string | null;
};

export function ConfirmedBattleMatchups({ selectedId, onSelect }: {
  selectedId: string | null;
  onSelect: (matchup: ConfirmedMatchup | null) => void;
}) {
  const list = useServerFn(listHostBattleChallenges);
  const schedule = useServerFn(scheduleBattleChallenge);
  const [when, setWhen] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["host-battle-challenges", "confirmed"],
    queryFn: () => list({ data: { confirmedOnly: true, status: null } }),
  });
  const rows = (data?.challenges ?? []) as ConfirmedMatchup[];
  const selected = rows.find(c => c.id === selectedId);
  useEffect(() => {
    const channel = supabase.channel(`confirmed-matchups-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_challenges" }, () => { void refetch(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refetch]);
  useEffect(() => {
    if (data && selectedId) onSelect(selected ?? null);
  }, [data, selectedId]);

  return <section className="space-y-2" aria-label="Confirmed matchups">
    <h4 className="text-xs font-semibold text-foreground">Confirmed matchups</h4>
    {isPending && <p className="text-xs text-muted-foreground">Loading matchups…</p>}
    {error && <p className="text-xs text-destructive">Could not load matchups. <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button></p>}
    {!isPending && !error && !rows.length && <p className="text-xs text-muted-foreground">No accepted matchups waiting.</p>}
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {rows.map(c => <Button key={c.id} variant="outline" aria-pressed={selectedId === c.id}
        onClick={() => { onSelect(c); setWhen(""); }}
        className={`h-auto w-full justify-start gap-2 whitespace-normal p-2 text-left ${selectedId === c.id ? "border-primary bg-primary/10" : ""}`}>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          {[
            { id: c.challenger_id, name: c.challenger_name, avatar: c.challenger_avatar, side: "A" },
            { id: c.challenged_id, name: c.challenged_name, avatar: c.challenged_avatar, side: "B" },
          ].map(p => <div key={p.id} className="flex min-w-0 items-center gap-2">
            <SignedImg src={p.avatar || "/icon-192.png"} alt={p.name} className="h-9 w-9 shrink-0 rounded-md object-cover" />
            <div className="min-w-0"><span className="text-[10px] text-muted-foreground">Side {p.side}</span><p className="break-words text-xs font-semibold">{p.name}</p><p className="text-[10px] text-primary">{c.genre}</p></div>
          </div>)}
          {c.scheduled_at && <p className="col-span-2 text-[10px] text-muted-foreground">Scheduled · {new Date(c.scheduled_at).toLocaleString()}</p>}
        </div>
        {selectedId === c.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </Button>)}
    </div>
    {selected && <div className="flex flex-wrap items-center gap-2">
      <Input aria-label="Battle schedule time" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="min-w-0 flex-1 text-base" />
      <Button size="sm" variant="outline" disabled={!when || scheduling} onClick={async () => {
        setScheduling(true);
        try { await schedule({ data: { challengeId: selected.id, scheduledAt: new Date(when).toISOString() } }); toast.success("Battle scheduled — both artists notified"); await refetch(); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Could not schedule battle"); }
        finally { setScheduling(false); }
      }}><Calendar className="mr-1 h-3.5 w-3.5" /> Schedule</Button>
    </div>}
  </section>;
}