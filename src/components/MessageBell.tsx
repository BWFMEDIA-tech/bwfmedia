import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UnreadBadge, useUnreadCount } from "@/components/UnreadBadge";

export function MessageBell() {
  const auth = useAuth();
  const count = useUnreadCount("messages");

  if (!auth.isAuthenticated) return null;
  return (
    <Link to="/messages" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition" aria-label="Messages">
      <MessageSquare size={16} className="text-bone/80" />
      <UnreadBadge count={count} />
    </Link>
  );
}