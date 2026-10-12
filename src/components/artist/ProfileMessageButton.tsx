import { Link } from "@tanstack/react-router";
import { Inbox, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function ProfileMessageButton({ artistId }: { artistId: string }) {
  const { user } = useAuth();
  const isOwner = user?.id === artistId;
  const Icon = isOwner ? Inbox : MessageSquare;

  return (
    <Button asChild className="h-11 w-full sm:w-auto">
      <Link to="/messages" search={isOwner ? {} : { to: artistId }}>
        <Icon aria-hidden="true" />
        {isOwner ? "Message Inbox" : "Message artist"}
      </Link>
    </Button>
  );
}