import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { Hand, LogOut, X as XIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { raiseHand, leaveStage, cancelHand } from "@/lib/stage.functions";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";

export function RaiseHandButton({ streamId, auth, label: idleLabel }: { streamId: string; auth: AuthState; label?: string }) {
  const topicId = useId();
  const raise = useServerFn(raiseHand);
  const leave = useServerFn(leaveStage);
  const cancel = useServerFn(cancelHand);
  const [status, setStatus] = useState<"idle" | "pending" | "accepted" | "declined">("idle");
  const [onStage, setOnStage] = useState(false);
  const [busy, setBusy] = useState(false);
  // Ref-based in-flight guard. Survives React Strict Mode double-invocation
  // and rapid double-clicks: setBusy(true) is async, so a second click in the
  // same tick would otherwise slip through before the disabled state lands.
  const inFlightRef = useRef(false);
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId || !streamId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("raise_hand_requests")
        .select("status, created_at")
        .eq("stream_id", streamId)
        .eq("user_id", userId)
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
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      setOnStage(data?.stage_role === "speaker" || data?.stage_role === "host" || data?.stage_role === "co_host");
    };
    refreshStage();
    const ch = supabase
      .channel(`hand-${streamId}-${userId}-${topicId}`)
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
  }, [streamId, auth.user?.id, topicId]);

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
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await raise({ data: { streamId } });
      // Only commit UI state after the server confirms. Realtime will also
      // reconcile via the postgres_changes subscription above.
      setStatus("pending");
      setRequestedAt(Date.now());
      toast.success("Hand raised — waiting for host");
    } catch (e: any) {
      toast.error(e?.message || "Could not raise hand");
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  };

  const onLeave = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await leave({ data: { streamId } });
      setOnStage(false);
      setStatus("idle");
      toast.success("Left the stage");
    } catch (e: any) {
      toast.error(e?.message || "Could not leave stage");
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await cancel({ data: { streamId } });
      setStatus("idle");
      setRequestedAt(null);
      toast.info("Request cancelled");
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel");
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  };

  if (onStage) {
    return (
      <Button variant="outline" size="sm"
        onClick={onLeave}
        disabled={busy}
        className="text-destructive"
      >
        <LogOut className="h-4 w-4" /> Leave stage
      </Button>
    );
  }

  if (status === "pending") {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return (
      <div role="status" className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <div className="flex flex-col leading-tight">
          <span>Waiting for host…</span>
          <span className="text-[10px] font-normal text-muted-foreground">Requested {timeStr} ago</span>
        </div>
        <Button variant="outline" size="sm"
          onClick={onCancel}
          disabled={busy}
          className="ml-1 h-7 px-2 text-xs"
          title="Cancel request"
        >
          <XIcon className="h-3 w-3" /> Cancel
        </Button>
      </div>
    );
  }

  const label =
    status === "declined" ? "Request again" : idleLabel ?? "Request to Join Stage";

  if (!auth.isAuthenticated) {
    return (
      <Button asChild size="sm"><Link to="/login"><Hand className="h-4 w-4" /> Sign in to raise hand</Link></Button>
    );
  }

  return (
    <Button size="sm"
      type="button"
      onClick={onClick}
      disabled={busy}
    >
      <Hand className="h-4 w-4" /> {label}
    </Button>
  );
}