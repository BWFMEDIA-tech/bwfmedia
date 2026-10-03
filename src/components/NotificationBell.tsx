import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function NotificationBell() {
  const auth = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!auth.user) { setCount(0); return; }
    const uid = auth.user.id;
    let cancelled = false;
    const refresh = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);
      if (!cancelled) setCount(c ?? 0);
    };
    refresh();
    // Both desktop and mobile headers mount this bell. Realtime reuses a
    // channel with the same topic, so each mount needs its own topic before
    // registering postgres_changes callbacks.
    const ch = supabase
      .channel(`notif-bell-${uid}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        refresh,
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [auth.user?.id]);

  if (!auth.isAuthenticated) return null;
  return (
    <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
      <Bell size={16} className="text-bone/80" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}