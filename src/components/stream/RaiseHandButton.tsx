import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Hand, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { raiseHand, leaveStage } from "@/lib/stage.functions";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";

export function RaiseHandButton({ streamId, auth }: { streamId: string; auth: AuthState }) {
  const raise = useServerFn(raiseHand);
  const leave = useServerFn(leaveStage);
  const [status, setStatus] = useState<"idle" | "pending" | "accepted" | "declined">("idle");
  const [onStage, setOnStage] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.user || !streamId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("raise_hand_requests")
        .select("status")
        .eq("stream_id", streamId)
        .eq("user_id", auth.user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setStatus(data.status as any);
    })();
    const refreshStage = async () => {
      const { data } = await supabase
        .from("stage_participants")
        .select("stage_role")
        .eq("stream_id", streamId)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (cancelled) return;
      setOnStage(data?.stage_role === "speaker" || data?.stage_role === "host");
    };
    refreshStage();
    const ch = supabase
      .channel(`hand-${streamId}-${auth.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raise_hand_requests", filter: `stream_id=eq.${streamId}` },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.user_id !== auth.user?.id) return;
          if (payload.eventType === "DELETE") setStatus("idle");
          else setStatus(row.status);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.user_id !== auth.user?.id) return;
          refreshStage();
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId, auth.user?.id]);

  const onClick = async () => {
    if (!auth.isAuthenticated) { toast.error("Sign in to raise your hand"); return; }
    setBusy(true);
    try {
      await raise({ data: { streamId } });
      setStatus("pending");
      toast.success("Hand raised — waiting for host");
    } catch (e: any) {
      toast.error(e?.message || "Could not raise hand");
    } finally { setBusy(false); }
  };

  const onLeave = async () => {
    setBusy(true);
    try {
      await leave({ data: { streamId } });
      setOnStage(false);
      setStatus("idle");
      toast.success("Left the stage");
    } catch (e: any) {
      toast.error(e?.message || "Could not leave stage");
    } finally { setBusy(false); }
  };

  if (onStage) {
    return (
      <button
        onClick={onLeave}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" /> Leave stage
      </button>
    );
  }

  const label =
    status === "pending" ? "Hand raised…" :
    status === "declined" ? "Request again" : "Request to Join Stage";

  return (
    <button
      onClick={onClick}
      disabled={busy || status === "pending"}
      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 ${
        status === "pending"
          ? "border border-amber-400/30 bg-amber-500/10 text-amber-100"
          : "border border-violet-400/30 bg-gradient-to-r from-violet-500/90 to-blue-500/90 hover:from-violet-500 hover:to-blue-500"
      }`}
    >
      <Hand className="h-4 w-4" /> {label}
    </button>
  );
}