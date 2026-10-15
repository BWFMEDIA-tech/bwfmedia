import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { touchPresence } from "@/lib/direct-messages.functions";
import { UnreadBadge, useUnreadCount } from "@/components/UnreadBadge";

export function MessageBell() {
  const auth = useAuth();
  const touch = useServerFn(touchPresence);

  // Presence heartbeat — mark this user "online" while the app is open.
  useEffect(() => {
    if (!auth.user) return;
    let cancelled = false;
    const ping = () => {
      if (cancelled || document.hidden) return;
      touch().catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const onVisible = () => { if (!document.hidden) ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.user?.id, touch]);

  const count = useUnreadCount("messages");

  if (!auth.isAuthenticated) return null;
  return (
    <Link to="/messages" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition" aria-label="Messages">
      <MessageSquare size={16} className="text-bone/80" />
      <UnreadBadge count={count} />
    </Link>
  );
}