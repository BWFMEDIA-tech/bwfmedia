import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBattleTournamentState, startNewBattleTournament } from "@/lib/battle-tournament.functions";

export function BattleTournamentStatus({ hostControls = false }: { hostControls?: boolean }) {
  const read = useServerFn(getBattleTournamentState);
  const reset = useServerFn(startNewBattleTournament);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({ queryKey: ["battle-tournament"], queryFn: () => read(), refetchInterval: 5000 });
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div><p className="text-sm font-semibold">Battle slots <span className="text-primary">{data ? `${data.filled}/${data.capacity}` : "—/20"}</span></p>
      <p className="text-xs text-muted-foreground">{data ? `${data.available} available` : "Loading slots…"}</p></div>
    {hostControls && <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
      if (!window.confirm("Start a new tournament and reset artist elimination? Outstanding matchups must finish or be canceled first.")) return;
      setBusy(true);
      try { await reset(); await qc.invalidateQueries(); toast.success("New tournament started"); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Could not start tournament"); }
      finally { setBusy(false); }
    }}><RotateCcw className="h-4 w-4" /> New tournament</Button>}
  </div>;
}