import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UnreadBadge, useUnreadCount } from "@/components/UnreadBadge";

export function NotificationBell() {
  const auth = useAuth();
  const count = useUnreadCount("notifications");
  if (!auth.isAuthenticated) return null;
  return (
    <Link to="/notifications" aria-label="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
      <Bell size={16} className="text-bone/80" />
      <UnreadBadge count={count} />
    </Link>
  );
}
