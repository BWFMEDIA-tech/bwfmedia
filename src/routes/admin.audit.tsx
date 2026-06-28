import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { listAuditLog } from "@/lib/admin-audit.functions";
import { toast } from "sonner";
import { ScrollText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditLogPage,
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
  metadata: any;
  created_at: string;
};

const CATS = ["all", "admin", "role", "stream", "ban", "payout", "moderation", "system"] as const;

function AuditLogPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listAuditLog);
  const isAdmin = auth.roles.includes("admin");

  const [cat, setCat] = useState<typeof CATS[number]>("all");
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    list({ data: cat === "all" ? {} : { category: cat } })
      .then((r) => setRows(r.entries as Entry[]))
      .catch((e: any) => toast.error(e?.message ?? "Failed to load audit log"))
      .finally(() => setLoading(false));
  }, [isAdmin, cat]);

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>
        <h1 className="mt-4 text-3xl font-bold flex items-center gap-3">
          <ScrollText className="h-7 w-7 text-violet-400" /> Audit Log
        </h1>
        <p className="mt-1 text-white/55">Every admin action across the platform.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                cat === c ? "bg-violet-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">No entries.</td></tr>
              ) : rows.map((e) => (
                <tr key={e.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-white/60">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-mono text-violet-200">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">
                    {e.actor_email ?? e.actor_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-white/60 font-mono text-xs">
                    {e.target_type ? `${e.target_type}:${(e.target_id ?? "").slice(0, 8)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/80">{e.summary ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}