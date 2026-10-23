import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { listLiveStreams } from "@/lib/live-broadcast.functions";
import { liveRosterRows, type LiveRosterEntry, type LiveRosterRow } from "./live-roster";
import { liveStageDestination } from "./live-stage-navigation";
import { useStageNavigationConnection } from "./stage-navigation-connection";

/**
 * One shared poll of the public live listing (streams + stage rooms). Consumers that
 * need different views of it — the navigation glow, the live-people list — reuse this
 * query instead of opening a second subscription to the same table.
 */
function useLiveStageFeed() {
  const connection = useStageNavigationConnection();
  const id = useId();
  const fetchLive = useServerFn(listLiveStreams);
  const [online, setOnline] = useState(true);
  const query = useQuery({
    queryKey: ["live-stage-navigation"],
    queryFn: () => fetchLive({ data: { limit: 50 } }),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: false,
  });
  useEffect(() => {
    const refresh = () => { void query.refetch(); };
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const channel = supabase.channel(`stage-navigation-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_rooms" }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void supabase.removeChannel(channel);
    };
  }, [id, query.refetch]);
  const entries: LiveRosterEntry[] = (query.isError ? [] : query.data?.streams ?? [])
    .filter((entry) => !connection || entry.id !== connection.streamId || connection.connected);
  return {
    entries,
    online,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => { void query.refetch(); },
  };
}

/** Where the live entries should go right now: the real broadcast when there is one. */
export function useLiveStageNavigation() {
  const auth = useAuth();
  const { entries, online } = useLiveStageFeed();
  return liveStageDestination(entries, auth.user?.id, online);
}

/** The people currently live on Tunevio, own broadcast first. */
export function useLiveRoster(): { rows: LiveRosterRow[]; isLoading: boolean; isError: boolean; retry: () => void } {
  const auth = useAuth();
  const { entries, isLoading, isError, retry } = useLiveStageFeed();
  return { rows: liveRosterRows(entries, auth.user?.id), isLoading, isError, retry };
}
