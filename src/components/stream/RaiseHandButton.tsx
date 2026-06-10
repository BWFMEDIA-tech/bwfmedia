import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Hand, LogOut, X as XIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { raiseHand, leaveStage, cancelHand } from "@/lib/stage.functions";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";

export function RaiseHandButton({ streamId, auth }: { streamId: string; auth: AuthState }) {
  const raise = useServerFn(raiseHand);
  const leave = useServerFn(leaveStage);
  const cancel = useServerFn(cancelHand);
  const [status, setStatus] = useState<"idle" | "pending" | "accepted" | "declined">("idle");
  const [onStage, setOnStage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!auth.user || !streamId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("raise_hand_requests")
        .select("status, created_at")
        .eq("stream_id", streamId)
        .eq("user_id", auth.user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setStatus(data.status as any);
      if (data.status === "pending" && data.created_at) {
        setRequestedAt(new Date(data.created_at).getTime());
      }
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
          if (payload.eventType === "DELETE") {
            setStatus("idle");
            setRequestedAt(null);
          } else {
            setStatus(row.status);
            if (row.status === "pending" && row.created_at) {
              setRequestedAt(new Date(row.created_at).getTime());
            } else if (row.status !== "pending") {
              setRequestedAt(null);
            }
          }
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

  // Ticking timer while pending
  useEffect(() => {
    if (status !== "pending" || !requestedAt) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      setElapsed(0);
      return;
    }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - requestedAt) / 1000)));
    update();
    tickRef.current = window.setInterval(update, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [status, requestedAt]);

  const onClick = async () => {
    if (!auth.isAuthenticated) { toast.error("Sign in to raise your hand"); return; }
    setBusy(true);
    try {
      await raise({ data: { streamId } });
      setStatus("pending");
      setRequestedAt(Date.now());
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

  const onCancel = async () => {
    setBusy(true);
    try {
      await cancel({ data: { streamId } });
      setStatus("idle");
      setRequestedAt(null);
      toast.info("Request cancelled");
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel");
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

  if (status === "pending") {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <div className="flex flex-col leading-tight">
          <span>Waiting for host…</span>
          <span className="text-[10px] font-normal text-amber-200/70">Requested {timeStr} ago</span>
        </div>
        <button
          onClick={onCancel}
          disabled={busy}
          className="ml-1 flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-50 hover:bg-amber-500/25 disabled:opacity-50"
          title="Cancel request"
        >
          <XIcon className="h-3 w-3" /> Cancel
        </button>
      </div>
    );
  }

  const label =
    status === "declined" ? "Request again" : "Request to Join Stage";

  if (!auth.isAuthenticated) {
    return (
      <a
        href="/auth"
        className="flex items-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-500/90 to-blue-500/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-violet-500 hover:to-blue-500"
      >
        <Hand className="h-4 w-4" /> Sign in to request stage
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-500/90 to-blue-500/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-violet-500 hover:to-blue-500 disabled:opacity-60"
    >
      <Hand className="h-4 w-4" /> {label}
    </button>
  );
}