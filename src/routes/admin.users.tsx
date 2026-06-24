import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { listUsers, assignRole, removeRole } from "@/lib/admin-users.functions";
import { toast } from "sonner";
import { Users, ArrowLeft, Plus, X, Search } from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

const ROLES = ["admin", "host", "artist", "moderator", "member"] as const;

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

function AdminUsersPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listUsers);
  const assign = useServerFn(assignRole);
  const remove = useServerFn(removeRole);
  const isAdmin = auth.roles.includes("admin");

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await list({ data: { search, page: 1, perPage: 100 } });
      setRows(r.users as UserRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const onAssign = async (userId: string, role: typeof ROLES[number]) => {
    const target = rows.find((r) => r.id === userId);
    const label = target?.display_name || target?.email || userId.slice(0, 8);
    const confirmText =
      role === "admin"
        ? `Grant FULL ADMIN to ${label}? They will gain unrestricted Control Center access. Type "GRANT ADMIN" to confirm.`
        : `Grant role "${role}" to ${label}?`;
    if (role === "admin") {
      const answer = prompt(confirmText, "");
      if (answer !== "GRANT ADMIN") {
        toast.message("Cancelled — confirmation phrase didn't match.");
        return;
      }
    } else if (!confirm(confirmText)) {
      return;
    }
    try {
      await assign({ data: { userId, role } });
      toast.success(`Granted ${role} (audit logged)`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const onRemove = async (userId: string, role: string) => {
    const target = rows.find((r) => r.id === userId);
    const label = target?.display_name || target?.email || userId.slice(0, 8);
    if (role === "admin") {
      const answer = prompt(
        `Revoke ADMIN from ${label}? This removes Control Center access. Type "REVOKE ADMIN" to confirm.`,
        "",
      );
      if (answer !== "REVOKE ADMIN") {
        toast.message("Cancelled — confirmation phrase didn't match.");
        return;
      }
    } else if (!confirm(`Remove role "${role}" from ${label}?`)) {
      return;
    }
    try {
      await remove({ data: { userId, role: role as typeof ROLES[number] } });
      toast.success(`Removed ${role} (audit logged)`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>
        <h1 className="mt-4 text-3xl font-bold flex items-center gap-3">
          <Users className="h-7 w-7 text-violet-400" /> User Management
        </h1>
        <p className="mt-1 text-white/55">Assign roles across the network. Removing your own admin role is blocked.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="mt-6 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name, or user ID…"
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm placeholder:text-white/30 focus:border-violet-400 outline-none"
            />
          </div>
          <button className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-400">
            Search
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Last sign-in</th>
                <th className="px-4 py-3 text-right">Assign</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-white/50">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-white/50">No users.</td></tr>
              ) : rows.map((u) => (
                <tr key={u.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <SignedImg src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                      )}
                      <div>
                        <div className="font-medium">{u.display_name || u.email || u.id.slice(0, 8)}</div>
                        <div className="text-xs text-white/40">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-white/40">none</span>}
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            r === "admin" ? "bg-violet-500/20 text-violet-200"
                            : r === "moderator" ? "bg-amber-500/20 text-amber-200"
                            : r === "artist" ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-white/10 text-white/60"
                          }`}
                        >
                          {r}
                          <button
                            onClick={() => onRemove(u.id, r)}
                            className="opacity-60 hover:opacity-100"
                            aria-label={`Remove ${r}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value as typeof ROLES[number] | "";
                        if (v) onAssign(u.id, v);
                        e.target.value = "";
                      }}
                      className="rounded-md border border-white/10 bg-[#0d0d18] px-2 py-1 text-xs text-white"
                    >
                      <option value="">+ Add role…</option>
                      {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
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