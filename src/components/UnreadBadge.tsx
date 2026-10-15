import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Source = "messages" | "notifications";

/** Live unread count from the signed-in user's own records. */
export function useUnreadCount(source: Source) {
  const auth = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!auth.user) { setCount(0); return; }
    const uid = auth.user.id;
    const table = source === "messages" ? "direct_messages" : "notifications";
    const col = source === "messages" ? "recipient_id" : "user_id";
    let cancelled = false;
    const refresh = async () => {
      const { count: c } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(col, uid)
        .is("read_at", null);
      if (!cancelled) setCount(c ?? 0);
    };
    refresh();
    // Unique topic per mount: desktop and mobile headers coexist.
    const ch = supabase
      .channel(`unread-${source}-${uid}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `${col}=eq.${uid}` }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [auth.user?.id, source]);
  return count;
}

export function formatUnread(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${formatUnread(count)} unread`}
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-background",
        className,
      )}
    >
      {formatUnread(count)}
    </span>
  );
}
