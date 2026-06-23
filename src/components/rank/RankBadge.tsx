import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getRankFromXp, type RankDef } from "@/lib/ranks";

const SIZE_MAP = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

type Size = keyof typeof SIZE_MAP;

interface BaseProps {
  size?: Size;
  className?: string;
  glow?: boolean;
  showLabel?: boolean;
}

function BadgeImage({ rank, size = "sm", className, glow = true, showLabel = false }: BaseProps & { rank: RankDef }) {
  const px = SIZE_MAP[size];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 align-middle", className)}
      title={rank.name}
      aria-label={`Rank: ${rank.name}`}
    >
      <img
        src={rank.image}
        alt={rank.name}
        width={px}
        height={px}
        loading="lazy"
        draggable={false}
        style={{
          width: px,
          height: px,
          filter: glow ? `drop-shadow(0 0 6px ${rank.glow})` : undefined,
        }}
      />
      {showLabel && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: rank.color }}
        >
          {rank.name}
        </span>
      )}
    </span>
  );
}

export function RankBadgeStatic({ xp, ...rest }: BaseProps & { xp: number | null | undefined }) {
  return <BadgeImage rank={getRankFromXp(xp)} {...rest} />;
}

/**
 * Async badge: looks up XP via the public `get_user_xp` RPC (cached by user_id).
 * Renders nothing while loading or if no user_id is provided so it stays out of the
 * way next to display names.
 */
export function RankBadge({
  userId,
  ...rest
}: BaseProps & { userId: string | null | undefined }) {
  const { data } = useQuery({
    queryKey: ["user-xp", userId],
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!userId) return 0;
      const { data, error } = await supabase.rpc("get_user_xp", { _user_id: userId });
      if (error) return 0;
      return (data as number | null) ?? 0;
    },
  });
  if (!userId || data == null) return null;
  return <BadgeImage rank={getRankFromXp(data)} {...rest} />;
}