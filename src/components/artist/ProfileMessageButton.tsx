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
      className={compact ? "ap-btn ap-btn-inbox" : "ap-btn ap-btn-inbox h-12 w-full sm:w-auto gap-2.5 px-7 text-base normal-case tracking-normal"}
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      {compact ? (isOwner ? "Inbox" : "Message") : isOwner ? "Message Inbox" : "Message Artist"}
    </Link>
  );
}
