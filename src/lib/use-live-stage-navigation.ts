import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { listLiveStreams } from "@/lib/live-broadcast.functions";
import { liveStageDestination } from "./live-stage-navigation";

export function useLiveStageNavigation() {
  const auth = useAuth();
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
  return liveStageDestination(query.isError ? [] : query.data?.streams ?? [], auth.user?.id, online);
}