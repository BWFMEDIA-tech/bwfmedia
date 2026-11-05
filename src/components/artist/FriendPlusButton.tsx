import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getIsFollowingArtist, toggleArtistFollow } from "@/lib/artist-follows.functions";
import { cn } from "@/lib/utils";

/**
 * Small "+" badge that sits on a person's photo so a viewer can add them as a
 * friend (the same follow relationship used on artist profiles). Turns into a
 * check once they're added. Renders nothing for your own photo.
 */
export function FriendPlusButton({
  userId,
  displayName,
  className,
}: {
  userId: string;
  displayName?: string | null;
  className?: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const fetchIsFollowing = useServerFn(getIsFollowingArtist);
  const toggleFn = useServerFn(toggleArtistFollow);

  const isSelf = user?.id === userId;
  const name = displayName?.trim() || "this artist";

  const followingQ = useQuery({
    queryKey: ["artist-following", userId],
    queryFn: () => fetchIsFollowing({ data: { artistId: userId } }),
    enabled: isAuthenticated && !isSelf,
  });

  const mut = useMutation({
    mutationFn: () => toggleFn({ data: { artistId: userId } }),
    onMutate: () => {
      const prev = followingQ.data?.following ?? false;
      qc.setQueryData(["artist-following", userId], { following: !prev });
      return { prev };
    },
    onSuccess: (res) => {
      qc.setQueryData(["artist-following", userId], { following: res.following });
      qc.setQueryData(["artist-follow-stats", userId], { count: res.count });
      toast.success(res.following ? `${name} added as a friend` : `${name} removed from your friends`);
    },
    onError: (e: any, _vars, ctx) => {
      qc.setQueryData(["artist-following", userId], { following: ctx?.prev ?? false });
      toast.error(e?.message ?? "Could not update friends");
    },
  });

  if (isSelf) return null;

  const following = followingQ.data?.following ?? false;

  return (
    <button
      type="button"
      aria-label={following ? `Remove ${name} from your friends` : `Add ${name} as a friend`}
      aria-pressed={following}
      title={following ? "Friends" : "Add as a friend"}
      disabled={mut.isPending}
      onClick={(e) => {
        // The photo itself is a link to the profile — don't follow the link.
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
          toast.error("Sign in to add friends");
          return;
        }
        mut.mutate();
      }}
      className={cn(
        "absolute -bottom-1 -left-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background transition-transform hover:scale-110 disabled:opacity-60 sm:h-9 sm:w-9",
        following
          ? "bg-tv-cyan text-black"
          : "bg-white/90 text-black hover:bg-white",
        className,
      )}
    >
      {following ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
