import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { listAuditLog, killAllStreams } from "@/lib/admin-audit.functions";
import { toast } from "sonner";
import { Activity, ArrowLeft, AlertTriangle, Radio, Shield, UserCog, CreditCard, Cog } from "lucide-react";

export const Route = createFileRoute("/admin/ops")({
  head: () => ({
    meta: [
      { title: "Live Ops Feed — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OpsFeedPage,
});

type Entry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

const ICONS: Record<string, any> = {
  stream: Radio,
  role: UserCog,
  ban: Shield,
  payout: CreditCard,
  moderation: Shield,
  system: Cog,
  admin: Activity,
};

function OpsFeedPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listAuditLog);
  const killFn = useServerFn(killAllStreams);
  const isAdmin = auth.roles.includes("admin");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [killing, setKilling] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    list({ data: { limit: 50 } }).then((r) => {
      const initial = r.entries as Entry[];
      seenRef.current = new Set(initial.map((e) => e.id));
      setEntries(initial);
    });

    const channel = supabase
      .channel("admin-ops-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        (payload) => {
          const row = payload.new as Entry;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          setEntries((prev) => [row, ...prev].slice(0, 100));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const onKill = async () => {
    const reason = prompt(
      "⚠ EMERGENCY: End ALL live streams network-wide. Type a reason (optional):",
      "",
    );
    if (reason === null) return;
    if (!confirm("Confirm: terminate every live broadcast right now?")) return;
    setKilling(true);
    try {
      const r = await killFn({ data: { reason: reason || undefined } });
      toast.success(`Kill switch fired — ${r.terminated} stream(s) ended`);
    } catch (e: any) {
      toast.error(e?.message ?? "Kill switch failed");
    } finally {
      setKilling(false);
    }
  };

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-7 w-7 text-violet-400" /> Live Ops Feed
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Realtime
              </span>
            </h1>
            <p className="mt-1 text-white/55">Streams, role changes, bans, and payouts as they happen.</p>
          </div>

          <button
            onClick={onKill}
            disabled={killing}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            {killing ? "Killing…" : "Kill switch: End all streams"}
          </button>
        </div>

        <ul className="mt-8 space-y-2">
          {entries.length === 0 && (
            <li className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40">
              Waiting for activity…
            </li>
          )}
          {entries.map((e) => {
            const Icon = ICONS[e.category] ?? Activity;
            return (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
              >
                <div className="rounded-lg bg-violet-500/15 p-2 text-violet-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs text-violet-200">{e.action}</span>
                    <span className="text-xs text-white/40">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-white/85">{e.summary ?? "—"}</div>
                  <div className="mt-1 text-xs text-white/40 font-mono">
                    {e.actor_email ?? e.actor_id?.slice(0, 8) ?? "system"}
                    {e.target_type && ` → ${e.target_type}:${(e.target_id ?? "").slice(0, 8)}`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}