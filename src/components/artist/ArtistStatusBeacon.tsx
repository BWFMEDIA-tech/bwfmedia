import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getArtistStatuses } from "@/lib/artist-status.functions";
import { touchPresence } from "@/lib/direct-messages.functions";
import { useAuth } from "@/lib/auth-context";
import type { ArtistStatus } from "@/lib/artist-status";
import { cn } from "@/lib/utils";
const StatusContext = createContext<{ statuses: Record<string, ArtistStatus>; register: (id: string) => () => void }>({ statuses: {}, register: () => () => {} });
export function ArtistStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, ArtistStatus>>({});
  const ids = useRef(new Map<string, number>());
  const refreshRef = useRef<() => void>(() => {});
  const broadcastRef = useRef<() => void>(() => {});
  const read = useServerFn(getArtistStatuses);
  const touch = useServerFn(touchPresence);
  const { user } = useAuth();
  const register = useCallback((id: string) => {
    ids.current.set(id, (ids.current.get(id) ?? 0) + 1);
    refreshRef.current();
    return () => { const count = ids.current.get(id) ?? 1; if (count > 1) ids.current.set(id, count - 1); else ids.current.delete(id); };
  }, []);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let pending = false;
    const refresh = async () => {
      if (running) { pending = true; return; }
      const list = [...ids.current.keys()];
      if (document.visibilityState === "hidden" || !list.length) return;
      running = true;
      try {
        const batches = await Promise.all(Array.from({ length: Math.ceil(list.length / 200) }, (_, i) => read({ data: { ids: list.slice(i * 200, (i + 1) * 200) } })));
        if (!disposed) setStatuses(Object.assign({}, ...batches));
      } catch { if (!disposed) setStatuses({}); }
      finally { running = false; if (pending && !disposed) { pending = false; schedule(); } }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void refresh(), 100); };
    refreshRef.current = schedule;
    const channel = supabase.channel(`artist-status-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_rooms" }, schedule)
      .subscribe();
    // Broadcast is only an invalidation hint; all labels still come from trusted records.
    const activity = supabase.channel("artist-status-activity")
      .on("broadcast", { event: "changed" }, schedule)
      .subscribe();
    broadcastRef.current = () => { void activity.send({ type: "broadcast", event: "changed", payload: {} }); };
    const interval = setInterval(schedule, 15_000);
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => { disposed = true; clearTimeout(timer); clearInterval(interval); document.removeEventListener("visibilitychange", schedule); refreshRef.current = () => {}; broadcastRef.current = () => {}; void supabase.removeChannel(channel); void supabase.removeChannel(activity); };
  }, [read]);
  useEffect(() => {
    if (!user) return;
    const heartbeat = () => { if (document.visibilityState !== "hidden") void touch().then(() => { refreshRef.current(); broadcastRef.current(); }).catch(() => {}); };
    heartbeat();
    const interval = setInterval(heartbeat, 30_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", heartbeat); };
  }, [user?.id, touch]);
  return <StatusContext.Provider value={{ statuses, register }}>{children}</StatusContext.Provider>;
}
export function ArtistStatusBeacon({ userId, className }: { userId: string; className?: string }) {
  const { statuses, register } = useContext(StatusContext);
  useEffect(() => register(userId), [userId, register]);
  const status = statuses[userId] ?? "offline";
  const label = status === "live" ? "Live" : status === "active" ? "Active" : "Offline";
  return <span role="img" aria-label={label} title={label} data-artist-status={status} data-artist-id={userId} className={cn("artist-status-beacon", className)} />;
}