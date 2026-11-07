import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { SignedImg } from "@/components/ui/signed-img";
import { BATTLE_GENRES, type BattleGenre } from "@/lib/battle-genres";
import { findGenreMatch, leaveGenreMatch, listGenreBattles, challengeArtist, agreeBattleGenre } from "@/lib/battles.functions";
import { getBattleTournamentState } from "@/lib/battle-tournament.functions";

/* ---------- Genre battle board ---------- */
export function GenreBattleBoard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const tournamentFn = useServerFn(getBattleTournamentState);
  const { data: tournament } = useQuery({ queryKey: ["battle-tournament"], queryFn: () => tournamentFn(), enabled: isAuthenticated, refetchInterval: 5000 });
  const listFn = useServerFn(listGenreBattles);
  const findFn = useServerFn(findGenreMatch);
  const leaveFn = useServerFn(leaveGenreMatch);
  const challengeFn = useServerFn(challengeArtist);
  const acceptFn = useServerFn(agreeBattleGenre);
  const [actingId, setActingId] = useState<string | null>(null);
  const challenge = async (opponentId: string, genre: BattleGenre, name: string) => {
    setActingId(opponentId);
    try {
      await challengeFn({ data: { opponentId, genre } });
      toast.success(`Challenge sent to ${name}`, { description: `They need to accept the ${genre} battle.` });
      qc.invalidateQueries({ queryKey: ["genre-battles"] });
      qc.invalidateQueries({ queryKey: ["battle-tournament"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send challenge");
    } finally {
      setActingId(null);
    }
  };
  const accept = async (matchId: string, genre: string) => {
    setActingId(matchId);
    try {
      await acceptFn({ data: { matchId } });
      toast.success(`Challenge accepted — ${genre} battle is ready`);
      qc.invalidateQueries({ queryKey: ["genre-battles"] });
      qc.invalidateQueries({ queryKey: ["battle-tournament"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not accept challenge");
    } finally {
      setActingId(null);
    }
  };
  const qc = useQueryClient();
  const [filter, setFilter] = useState<BattleGenre | null>(null);
  const [pick, setPick] = useState<BattleGenre | "">("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["genre-battles", filter],
    queryFn: () => listFn({ data: { genre: filter } }),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
  });

  const join = async () => {
    if (!pick) return toast.error("Choose the genre you want to battle in");
    setBusy(true);
    try {
      await findFn({ data: { genre: pick } });
      toast.success(`You're looking for a ${pick} battle`);
      setFilter(pick);
      qc.invalidateQueries({ queryKey: ["genre-battles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not join matchmaking");
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    setBusy(true);
    try {
      await leaveFn();
      toast.success("You left matchmaking");
      qc.invalidateQueries({ queryKey: ["genre-battles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not leave matchmaking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="genre-battles" className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0a0a14] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-[#00E6FF]" />
        <h3 className="text-xs font-bold tracking-widest text-white/50">1V1 BATTLES BY GENRE</h3>
      </div>
      <p className="mt-1 text-sm text-white/70">Pick your genre, get matched with artists in your category.</p>

      {!isAuthenticated ? (
        <p className="mt-4 text-sm text-white/60">
          <Link to="/login" className="font-semibold text-[#00E6FF] hover:underline">Sign in</Link> to find a match and browse battles by genre.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value as BattleGenre)}
              className="w-full sm:w-64 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-base sm:text-sm text-white"
              aria-label="Battle genre"
            >
              <option value="" disabled>Choose your battle genre…</option>
              {BATTLE_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button
              onClick={join}
              disabled={busy || !tournament?.canSubmit}
              className="rounded-lg bg-[#0000FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0000CC] disabled:opacity-50"
            >
              {data?.myGenre ? "SWITCH GENRE" : "FIND MATCH"}
            </button>
            {data?.myGenre && (
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span>Searching in</span>
                <GenreBadge genre={data.myGenre} />
                <button onClick={leave} disabled={busy} className="text-white/50 underline hover:text-white">Leave</button>
              </div>
            )}
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <FilterChip active={filter === null} onClick={() => setFilter(null)}>All genres</FilterChip>
            {BATTLE_GENRES.map((g) => (
              <FilterChip key={g} active={filter === g} onClick={() => setFilter(g)}>{g}</FilterChip>
            ))}
          </div>

          {(data?.incoming ?? []).length > 0 && (
            <div className="mt-4 rounded-xl border border-[#00E6FF]/40 bg-[#00E6FF]/5 p-4">
              <p className="text-sm font-bold">Challenges for you</p>
              <ul className="mt-3 space-y-2">
                {data!.incoming.map((m: any) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-semibold">{m.artist_a_name ?? "An artist"}</span> wants to battle you
                    </span>
                    <GenreBadge genre={m.genre} />
                    <button
                      onClick={() => accept(m.id, m.genre)}
                      disabled={actingId === m.id || !tournament || tournament.eliminated || tournament.filled >= 20}
                      className="rounded-md bg-[#0000FF] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#0000CC] disabled:opacity-50"
                    >
                      {actingId === m.id ? "Accepting…" : "Accept"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isError ? (
            <p className="mt-4 text-sm text-red-300">Couldn't load battles. Try again shortly.</p>
          ) : isLoading ? (
            <p className="mt-4 text-sm text-white/50">Loading battles…</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#11111d] p-4">
                <p className="text-sm font-bold">Artists looking for a battle</p>
                {(data?.challengers ?? []).length === 0 ? (
                  <p className="mt-3 text-xs text-white/50">No artists waiting{filter ? ` in ${filter}` : ""} right now.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data!.challengers.map((c: any) => (
                      <li key={c.user_id} className="flex items-center gap-3">
                        {c.avatar_url ? (
                          <SignedImg src={c.avatar_url} alt={c.display_name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0000FF] text-[10px] font-bold">
                            {String(c.display_name).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">{c.display_name}</span>
                        <GenreBadge genre={c.genre} />
                        <button
                          onClick={() => challenge(c.user_id, c.genre, c.display_name)}
                          disabled={actingId === c.user_id || !tournament?.canSubmit}
                          className="rounded-md border border-[#00E6FF]/40 px-2.5 py-1 text-[11px] font-bold text-[#00E6FF] hover:bg-[#00E6FF]/10 disabled:opacity-50"
                        >
                          {actingId === c.user_id ? "Sending…" : "Challenge"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#11111d] p-4">
                <p className="text-sm font-bold">Battles</p>
                {(data?.battles ?? []).length === 0 ? (
                  <p className="mt-3 text-xs text-white/50">No battles{filter ? ` in ${filter}` : ""} yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data!.battles.map((b: any) => {
                      const content = (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <GenreBadge genre={b.genre} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${b.status === "live" ? "text-[#00E6FF]" : "text-white/40"}`}>
                              {b.status === "pending" ? (b.genre_agreed_a && b.genre_agreed_b ? "Ready" : "Awaiting agreement") : b.status}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-semibold">
                            {b.artist_a_name ?? "Artist A"} <span className="text-white/40">vs</span> {b.artist_b_name ?? "Artist B"}
                          </p>
                        </>
                      );
                      return (
                        <li key={b.id}>
                          {b.room_name && b.status !== "completed" ? (
                            <Link to="/stream/$room" params={{ room: b.room_name }} className="block rounded-lg border border-white/10 p-3 hover:bg-white/5">
                              {content}
                            </Link>
                          ) : (
                            <div className="rounded-lg border border-white/10 p-3">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-[#00E6FF] bg-[#00E6FF]/15 text-[#00E6FF]" : "border-white/15 text-white/70 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function GenreBadge({ genre }: { genre: string | null }) {
  if (!genre) return null;
  return (
    <span className="shrink-0 rounded-full border border-[#00E6FF]/40 bg-[#00E6FF]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00E6FF]">
      {genre}
    </span>
  );
}
