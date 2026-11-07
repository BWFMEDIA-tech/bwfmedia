import { useCallback, useEffect, useState } from "react";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { respondBattleChallenge } from "@/lib/battle-challenges.functions";
import { SignedImg } from "@/components/ui/signed-img";
import logoAsset from "@/assets/tunevio-logo.png.asset.json";

type PendingChallenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  genre: string;
  created_at: string;
};

type ArtistProfile = {
  id: string;
  display_name: string | null;
  stage_name: string | null;
  avatar_url: string | null;
};

function artistName(p: ArtistProfile | undefined): string {
  return p?.stage_name || p?.display_name || "Artist";
}

function ArtistPhoto({ profile, label }: { profile: ArtistProfile | undefined; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-primary/50 shadow-[0_0_24px_oklch(0.75_0.15_220_/_35%)] sm:h-28 sm:w-28">
        {profile?.avatar_url ? (
          <SignedImg src={profile.avatar_url} alt={artistName(profile)} className="h-full w-full object-cover" />
        ) : (
          <img src={logoAsset.url} alt="Tunevio" className="h-full w-full object-cover" />
        )}
      </div>
      <p className="max-w-full truncate text-sm font-extrabold uppercase tracking-wide text-foreground">{artistName(profile)}</p>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Login-triggered "YOU'VE BEEN CHALLENGED!" pop-up for 1v1 song battles.
 * Shows the challenged artist their oldest pending challenge (one at a time),
 * stays up until answered, and refreshes as challenges arrive.
 */
export function BattleChallengePopup() {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [challenges, setChallenges] = useState<PendingChallenge[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ArtistProfile>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("battle_challenges")
      .select("id,challenger_id,challenged_id,genre,created_at")
      .eq("challenged_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) return;
    const rows = (data ?? []) as PendingChallenge[];
    setChallenges(rows);
    const ids = [...new Set(rows.flatMap((c) => [c.challenger_id, c.challenged_id]))];
    if (ids.length === 0) return;
    const { data: artists } = await supabase
      .from("public_profiles")
      .select("id,display_name,stage_name,avatar_url")
      .in("id", ids);
    const map: Record<string, ArtistProfile> = {};
    for (const p of (artists ?? []) as ArtistProfile[]) map[p.id] = p;
    setProfiles(map);
  }, [userId]);

  useEffect(() => {
    if (!userId || !auth.isAuthenticated) {
      setChallenges([]);
      return;
    }
    void load();
    const channel = supabase
      .channel(`battle-challenge-popup-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_challenges", filter: `challenged_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();
    const interval = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, auth.isAuthenticated, load]);

  const current = challenges[0] ?? null;

  const respond = async (accept: boolean) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await respondBattleChallenge({ data: { challengeId: current.id, accept } });
      setChallenges((prev) => prev.filter((c) => c.id !== current.id));
      toast.success(accept ? "Battle accepted — get ready!" : "Challenge declined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not answer the challenge");
      void load();
    } finally {
      setBusy(false);
    }
  };

  if (!current) return null;
  const challenger = profiles[current.challenger_id];
  const you = profiles[current.challenged_id];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Battle challenge">
      <div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-6 text-center shadow-[0_0_60px_oklch(0.75_0.15_220_/_25%)] sm:p-8">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
          <Swords className="h-7 w-7 text-primary" aria-hidden />
          You&apos;ve been challenged!
        </h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-primary">1v1 Battle Challenge</p>

        <div className="mt-6 flex items-start justify-center gap-2 sm:gap-4">
          <ArtistPhoto profile={challenger} label="Challenger" />
          <div className="flex h-24 items-center sm:h-28">
            <span className="text-3xl font-black italic text-red-500 drop-shadow-[0_0_12px_oklch(0.6_0.25_25_/_60%)] sm:text-4xl">VS</span>
          </div>
          <ArtistPhoto profile={you} label="You" />
        </div>

        <p className="mt-6 text-base font-bold text-foreground">
          {artistName(challenger)} has challenged you to a 1v1 battle!
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Genre: {current.genre}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(true)}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Accept battle
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(false)}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
