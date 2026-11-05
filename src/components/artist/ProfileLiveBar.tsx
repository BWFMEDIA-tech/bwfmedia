import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DirectoryRow } from "@/lib/live-directory";
import { stageDestination } from "@/lib/live-stage-navigation";

/**
 * Instagram/TikTok-style live strip on an artist profile.
 * Shows a LIVE pill + watch link while the artist is broadcasting,
 * and a Go Live shortcut for the profile owner when they are not.
 */
export function ProfileLiveBar({ live, isOwner }: { live: DirectoryRow | null; isOwner: boolean }) {

  if (live) {
    return (
      <Button asChild variant="outline" className="h-auto w-full justify-start gap-3 border-primary bg-primary/10 px-4 py-3 text-foreground hover:bg-primary/20">
        <Link {...stageDestination(live)}>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"><Radio className="h-3.5 w-3.5" /> LIVE</span>
          <span className="min-w-0 flex-1 truncate text-left text-sm">{live.title || "Live now"}</span>
          <span className="shrink-0 text-xs font-semibold text-primary">Join live</span>
        </Link>
      </Button>
    );
  }

  if (!isOwner) return null;

  return (
    <Button asChild variant="outline" className="h-auto w-full justify-start gap-3 px-4 py-3">
      <Link to="/go-live"><Radio className="h-4 w-4 text-primary" /><span className="flex-1 text-left">Go Live</span><span className="text-xs text-primary">Start</span></Link>
    </Button>
  );
}
