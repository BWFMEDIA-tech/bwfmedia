import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { listVoteAttempts, type VoteAttempt } from "@/lib/vote-attempts.functions";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, ShieldAlert, Filter, RotateCw } from "lucide-react";

export const Route = createFileRoute("/admin/vote-attempts")({
  head: () => ({
    meta: [
      { title: "Battle Vote Attempts — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VoteAttemptsPage,
});

type Filters = {
  match_id: string;
  voter_id: string;
  reason: string;
  outcome: "" | "allowed" | "blocked";
  since: string; // local datetime-local string
  until: string;
};

const EMPTY: Filters = {
  match_id: "",
  voter_id: "",
  reason: "",
  outcome: "",
  since: "",
  until: "",
};

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function matchesFilters(row: VoteAttempt, f: Filters): boolean {
  if (f.match_id && row.match_id !== f.match_id) return false;
  if (f.voter_id && row.voter_id !== f.voter_id) return false;
  if (f.reason && !row.reason.toLowerCase().includes(f.reason.toLowerCase())) return false;
  if (f.outcome && row.outcome !== f.outcome) return false;
  const t = new Date(row.created_at).getTime();
  const since = toIso(f.since);
  const until = toIso(f.until);
  if (since && t < new Date(since).getTime()) return false;
  if (until && t > new Date(until).getTime()) return false;
  return true;
}

function VoteAttemptsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listVoteAttempts);
  const isAdmin = auth.roles.includes("admin");

  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<VoteAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const r = await list({
        data: {
          match_id: filters.match_id || null,
          voter_id: filters.voter_id || null,
          reason: filters.reason || null,
          outcome: filters.outcome || null,
          since: toIso(filters.since),
          until: toIso(filters.until),
          limit: 200,
        } as any,
      });
      seenRef.current = new Set(r.entries.map((e) => e.id));
      setRows(r.entries);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchRows();
    const channel = supabase
      .channel("admin-vote-attempts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "battle_vote_attempts" },
        (payload) => {
          const row = payload.new as VoteAttempt;
          if (seenRef.current.has(row.id)) return;
          if (!matchesFilters(row, filtersRef.current)) return;
          seenRef.current.add(row.id);
          setRows((prev) => [row, ...prev].slice(0, 500));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const counts = useMemo(() => {
    const allowed = rows.filter((r) => r.outcome === "allowed").length;
    return { total: rows.length, allowed, blocked: rows.length - allowed };
  }, [rows]);

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-fuchsia-400" /> Battle Vote Attempts
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Realtime
              </span>
            </h1>
            <p className="mt-1 text-white/55">
              Every allowed and blocked vote attempt across all battles.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-white/70">
              Total <b className="text-white">{counts.total}</b>
            </span>
            <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-300">
              Allowed <b>{counts.allowed}</b>
            </span>
            <span className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300">
              Blocked <b>{counts.blocked}</b>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FilterField label="Match ID">
              <input
                type="text"
                value={filters.match_id}
                onChange={(e) => setFilters((f) => ({ ...f, match_id: e.target.value.trim() }))}
                placeholder="uuid"
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono"
              />
            </FilterField>
            <FilterField label="Voter ID">
              <input
                type="text"
                value={filters.voter_id}
                onChange={(e) => setFilters((f) => ({ ...f, voter_id: e.target.value.trim() }))}
                placeholder="uuid"
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono"
              />
            </FilterField>
            <FilterField label="Reason contains">
              <input
                type="text"
                value={filters.reason}
                onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. duplicate, self_vote"
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </FilterField>
            <FilterField label="Outcome">
              <select
                value={filters.outcome}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, outcome: e.target.value as Filters["outcome"] }))
                }
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="allowed">Allowed</option>
                <option value="blocked">Blocked</option>
              </select>
            </FilterField>
            <FilterField label="Since">
              <input
                type="datetime-local"
                value={filters.since}
                onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value }))}
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </FilterField>
            <FilterField label="Until">
              <input
                type="datetime-local"
                value={filters.until}
                onChange={(e) => setFilters((f) => ({ ...f, until: e.target.value }))}
                className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </FilterField>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={fetchRows}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/30 px-4 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/30 disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Apply filters"}
            </button>
            <button
              onClick={() => {
                setFilters(EMPTY);
                setTimeout(fetchRows, 0);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.08]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Voter</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                    {loading ? "Loading…" : "No attempts match these filters."}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.outcome === "allowed" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                        <ShieldCheck className="h-3 w-3" /> Allowed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                        <ShieldAlert className="h-3 w-3" /> Blocked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/85">{r.reason}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">
                    {r.match_id ? r.match_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">
                    {r.voter_id ? r.voter_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/50 max-w-xs truncate">
                    {r.metadata && Object.keys(r.metadata).length
                      ? JSON.stringify(r.metadata)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}