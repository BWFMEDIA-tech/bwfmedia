import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Calendar, CheckCircle2, Users, Radio, DollarSign, ShoppingBag, ArrowUp, Crown, Pencil, Save } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Card } from "@/components/admin/AdminShell";
import { getAdminProfile, updateAdminProfile, getAdminOverview } from "@/lib/admin-overview.functions";
import { SignedImg } from "@/components/ui/signed-img";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Admin Profile — BWF Network" }, { name: "robots", content: "noindex" }] }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getAdminProfile);
  const fetchOverview = useServerFn(getAdminOverview);
  const updateFn = useServerFn(updateAdminProfile);
  const isAdmin = auth.roles.includes("admin");

  const { data, isLoading } = useQuery({ queryKey: ["admin-profile"], queryFn: () => fetchProfile(), enabled: isAdmin });
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview(), enabled: isAdmin });

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setDisplayName(data.profile.display_name ?? "");
      setBio(data.profile.bio ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { display_name: displayName, bio } }),
    onSuccess: () => { toast.success("Profile updated"); setEditing(false); qc.invalidateQueries({ queryKey: ["admin-profile"] }); },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  if (isLoading) return <div className="text-sm text-white/50">Loading…</div>;
  const p = data?.profile;
  const joined = data?.createdAt ? new Date(data.createdAt) : null;

  return (
    <>
      <PageHeader title="Admin Profile" subtitle="Manage your admin account settings and preferences." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Identity card */}
          <Card>
            <div className="flex flex-wrap items-start gap-5">
              <Avatar url={p?.avatar_url} name={p?.display_name || "Admin"} size={120} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{p?.display_name || "Admin"}</h2>
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-blue-300">
                  <Crown className="h-3 w-3" /> Super Admin
                </div>
                <div className="mt-3 space-y-1 text-sm text-white/70">
                  <div className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-white/40" /> {data?.email || "—"}</div>
                  <div className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-white/40" /> Joined {joined ? joined.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}</div>
                  <div className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online</div>
                </div>
              </div>
              <button
                onClick={() => (editing ? save.mutate() : setEditing(true))}
                disabled={save.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50"
              >
                {editing ? <><Save className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit Profile</>}
              </button>
            </div>
          </Card>

          {/* Personal info */}
          <Card>
            <h3 className="mb-4 text-lg font-bold">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display Name">
                <input
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!editing}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none disabled:opacity-70 focus:border-blue-500/50"
                />
              </Field>
              <Field label="Email Address">
                <input value={data?.email || ""} disabled className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm opacity-70" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bio">
                  <textarea
                    rows={3} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} disabled={!editing}
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none disabled:opacity-70 focus:border-blue-500/50"
                  />
                </Field>
                <div className="mt-1 text-right text-[10px] text-white/40">{bio.length}/500</div>
              </div>
              <Field label="Role"><div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-300">Super Admin</div></Field>
              <Field label="Member Since"><div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">{joined ? joined.toLocaleDateString() : "—"}</div></Field>
            </div>
          </Card>

          {/* Permissions */}
          <Card>
            <h3 className="mb-4 text-lg font-bold">Administrator Permissions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "User Management", desc: "Create, edit, suspend users", to: "/admin/users" },
                { label: "Content Management", desc: "Manage all platform content", to: "/admin/content" },
                { label: "Live Stream Control", desc: "Monitor and control streams", to: "/admin/streams" },
                { label: "Financial Management", desc: "View and manage finances", to: "/admin/transactions" },
                { label: "System Settings", desc: "Configure platform settings", to: "/admin/settings" },
                { label: "Reports & Analytics", desc: "Access all reports and data", to: "/admin/analytics" },
              ].map((perm) => (
                <Link key={perm.to} to={perm.to} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/5">
                  <div>
                    <div className="text-sm font-semibold">{perm.label}</div>
                    <div className="text-xs text-white/50">{perm.desc}</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Enabled</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-bold">Admin Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <Mini icon={Users} color="#3b82f6" label="Total Users" value={overview.data?.cards.totalUsers.value ?? 0} />
              <Mini icon={Radio} color="#ef4444" label="Live Streams" value={overview.data?.cards.liveStreams.value ?? 0} />
              <Mini icon={DollarSign} color="#22c55e" label="Revenue" value={`$${((overview.data?.cards.totalRevenueCents.value ?? 0) / 100).toFixed(0)}`} />
              <Mini icon={ShoppingBag} color="#a855f7" label="Merch Sales" value={overview.data?.cards.merchSales.value ?? 0} />
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-bold">Recent Admin Activity</h3>
            {!data?.recentActions.length ? (
              <div className="py-6 text-center text-xs text-white/40">No actions yet</div>
            ) : (
              <div className="space-y-3">
                {data.recentActions.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ArrowUp className="mt-0.5 h-3 w-3 text-blue-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{a.summary || a.action}</div>
                      <div className="text-[10px] text-white/40">{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-white/5 pt-3 text-xs text-white/60">
              <span className="font-bold text-white">{data?.actionsLast30Days ?? 0}</span> actions in the last 30 days
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 text-lg font-bold">Session</h3>
            <div className="text-xs text-white/60">
              <div>Last sign in: {data?.lastSignInAt ? new Date(data.lastSignInAt).toLocaleString() : "—"}</div>
            </div>
            <button
              onClick={() => auth.signOut()}
              className="mt-4 w-full rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
            >
              Sign out
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      {children}
    </label>
  );
}

function Mini({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <Icon className="mb-2 h-4 w-4" style={{ color }} />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

function Avatar({ url, name, size }: { url?: string | null; name: string; size: number }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return url ? (
    <SignedImg src={url} alt="" style={{ width: size, height: size }} className="rounded-full border-2 border-blue-500/60 object-cover" />
  ) : (
    <div style={{ width: size, height: size }} className="grid place-items-center rounded-full border-2 border-blue-500/60 bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-bold">
      {initials}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}