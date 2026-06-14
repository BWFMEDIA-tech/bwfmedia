import { Link } from "@tanstack/react-router";
import { Sparkles, Clock } from "lucide-react";
import { useArtistSubscription } from "@/hooks/useArtistSubscription";
import { useAuth } from "@/lib/auth-context";

export function ArtistTrialBanner() {
  const auth = useAuth();
  const { isTrialing, daysLeft, isActive, isLoading } = useArtistSubscription();
  const isArtist = auth.roles?.includes("artist");
  if (!auth.isAuthenticated || !isArtist || isLoading) return null;

  if (isTrialing) {
    return (
      <div className="w-full bg-gradient-to-r from-fuchsia-600/90 via-pink-600/90 to-cyan-500/90 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Clock size={16} className="shrink-0" />
        <span className="font-medium">
          Free trial: {daysLeft ?? 7} day{daysLeft === 1 ? "" : "s"} left
        </span>
        <Link to="/artist/upgrade" className="underline font-semibold hover:opacity-90">
          Manage billing
        </Link>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="w-full bg-gradient-to-r from-fuchsia-700 to-cyan-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Sparkles size={16} className="shrink-0" />
        <span className="font-medium">Start your 7-day free Artist trial — $6.99/mo after.</span>
        <Link
          to="/artist/upgrade"
          className="bg-white text-fuchsia-700 font-semibold px-3 py-1 rounded-full text-xs hover:bg-white/90"
        >
          Start trial
        </Link>
      </div>
    );
  }

  return null;
}