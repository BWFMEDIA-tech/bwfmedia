import { Link } from "@tanstack/react-router";
import { Inbox, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function ProfileMessageButton({ artistId, compact = false }: { artistId: string; compact?: boolean }) {
  const { user } = useAuth();
  const isOwner = user?.id === artistId;
  const Icon = isOwner ? Inbox : Send;

  return (
    <Link
      to="/messages"
      search={isOwner ? {} : { to: artistId }}
      className={compact ? "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white transition hover:brightness-110" : "inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full px-7 text-base font-semibold text-white transition hover:brightness-110"}
      style={{
        background: "linear-gradient(90deg, var(--brand-cyan), var(--brand-blue))",
        boxShadow:
          "0 0 0 1px color-mix(in srgb, var(--brand-cyan) 45%, transparent), 0 8px 32px color-mix(in srgb, var(--brand-blue) 55%, transparent), 0 2px 10px color-mix(in srgb, var(--brand-cyan) 40%, transparent)",
      }}
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      {compact ? (isOwner ? "Inbox" : "Message") : isOwner ? "Message Inbox" : "Message Artist"}
    </Link>
  );
}
