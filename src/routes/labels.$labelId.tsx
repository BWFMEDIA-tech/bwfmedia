import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2, Users, Disc3, Plus, Copy, Trash2, ShieldCheck, ArrowLeft, Check, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getLabel, updateLabel, createLabelInvite, revokeLabelInvite,
  setMemberRole, removeMember, setRosterStatus,
  LABEL_ROLES, LABEL_ROLE_META, labelCan, type LabelRole,
} from "@/lib/labels.functions";

export const Route = createFileRoute("/labels/$labelId")({
  head: () => ({
    meta: [
      { title: "Label workspace — Tunevio" },
      { name: "description", content: "Manage your label team, roster and releases on Tunevio." },
      { property: "og:title", content: "Label workspace — Tunevio" },
      { property: "og:description", content: "Manage your label team, roster and releases on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LabelWorkspace,
});

const RELEASE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  submitted: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
  live: "bg-cyan-500/15 text-cyan-300",
};

function LabelWorkspace() {
  const { labelId } = Route.useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const fetchLabel = useServerFn(getLabel);
  const [tab, setTab] = useState<"team" | "roster" | "releases" | "settings">("team");

  const q = useQuery({
    queryKey: ["label", labelId],
    queryFn: () => fetchLabel({ data: { id: labelId } }),
    enabled: !!auth.user,
    retry: false,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["label", labelId] });

  if (!auth.user) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center">
        <Link to="/login" className="px-5 py-2.5 rounded-full font-semibold text-black bg-[#00E6FF]">Sign in</Link>
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-white/70 mb-4">{(q.error as any)?.message ?? "Label unavailable"}</p>
          <Link to="/labels" className="text-[#00E6FF]">Back to labels</Link>
        </div>
      </div>
    );
  }
  if (!q.data) {
    return <div className="min-h-screen bg-[#050509] text-white p-10 text-white/50">Loading label…</div>;
  }

  const { label, role, members, roster, invites, releases } = q.data as any;
  const myRole = role as LabelRole;

  const visibleTabs = (
    [
      { id: "team", show: myRole !== "finance" },
      { id: "roster", show: myRole !== "finance" },
      { id: "releases", show: labelCan(myRole, "viewReleases") },
      { id: "earnings", show: labelCan(myRole, "viewEarnings") },
      { id: "settings", show: labelCan(myRole, "editLabel") },
    ] as const
  ).filter((t) => t.show);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? "earnings";

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/labels" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> All labels
        </Link>

        <div className="flex items-center gap-4 mb-8">
          {label.logo_url ? (
            <img src={label.logo_url} alt={`${label.name} logo`} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white/40" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">{label.name}</h1>
            <span
              className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${LABEL_ROLE_META[myRole].color}22`, color: LABEL_ROLE_META[myRole].color }}
              title={LABEL_ROLE_META[myRole].blurb}
            >
              <ShieldCheck className="w-3 h-3" /> {LABEL_ROLE_META[myRole].label}
            </span>
            <p className="text-[11px] text-white/40 mt-1">{LABEL_ROLE_META[myRole].blurb}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition ${
                activeTab === t.id ? "bg-[#C53DFF] text-white" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {t.id}
            </button>
          ))}
        </div>

        {activeTab === "team" && (
          <TeamTab labelId={labelId} myRole={myRole} members={members} invites={invites} onChanged={refresh} />
        )}
        {activeTab === "roster" && (
          <RosterTab labelId={labelId} myRole={myRole} roster={roster} invites={invites} onChanged={refresh} />
        )}
        {activeTab === "releases" && <ReleasesTab releases={releases} myRole={myRole} />}
        {activeTab === "earnings" && <EarningsTab labelId={labelId} myRole={myRole} />}
        {activeTab === "settings" && <SettingsTab label={label} myRole={myRole} onChanged={refresh} />}
      </div>
    </div>
  );
}

function EarningsTab({ labelId, myRole }: { labelId: string; myRole: LabelRole }) {
  const fetchEarnings = useServerFn(getLabelEarnings);
  const q = useQuery({
    queryKey: ["label-earnings", labelId],
    queryFn: () => fetchEarnings({ data: { id: labelId } }),
    retry: false,
  });
  if (!labelCan(myRole, "viewEarnings")) {
    return <p className="text-sm text-white/50">Your role does not include financial access.</p>;
  }
  if (q.isError) {
    return <p className="text-sm text-red-400">{(q.error as any)?.message ?? "Could not load earnings"}</p>;
  }
  if (!q.data) return <p className="text-sm text-white/50">Loading earnings…</p>;
  const { artists, totals } = q.data as any;
  const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total royalties", value: money(totals.total_cents), color: "#C53DFF" },
          { label: "Paid out", value: money(totals.paid_cents), color: "#4ade80" },
          { label: "Pending", value: money(totals.pending_cents), color: "#fbbf24" },
          { label: "Streams", value: Number(totals.total_streams).toLocaleString(), color: "#00E6FF" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/40">{s.label}</p>
            <p className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="font-bold mb-3">Per-artist royalties</h3>
        {artists.length === 0 && (
          <p className="text-sm text-white/50">No royalty activity for your roster yet. Earnings appear here once streams generate revenue.</p>
        )}
        <div className="space-y-2">
          {artists.map((a: any) => (
            <div key={a.artist_id} className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/5 p-3">
              {a.profile?.avatar_url ? (
                <img src={a.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{a.profile?.display_name ?? "Artist"}</p>
                <p className="text-[11px] text-white/40">{Number(a.total_streams).toLocaleString()} streams · {a.months} month{a.months === 1 ? "" : "s"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#4ade80]">{money(a.total_cents)}</p>
                <p className="text-[11px] text-white/40">{money(a.pending_cents)} pending</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-white/30">Finance seats are read-only: earnings and royalties only, no release editing or roster management.</p>
    </div>
  );
}

function InviteRow({ invite, canManage, labelId, onChanged }: any) {
  const runRevoke = useServerFn(revokeLabelInvite);
  const revoke = useMutation({
    mutationFn: () => runRevoke({ data: { id: invite.id, label_id: labelId } }),
    onSuccess: () => { toast.success("Invite revoked"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not revoke"),
  });
  const url = typeof window !== "undefined" ? `${window.location.origin}/label-invite/${invite.code}` : invite.code;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm truncate">{invite.email || "Open invite link"}</div>
        <div className="text-[11px] text-white/40 truncate">{url}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { navigator.clipboard?.writeText(url); toast.success("Invite link copied"); }}
          className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-white"
          aria-label="Copy invite link"
        >
          <Copy className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={() => revoke.mutate()} className="p-2 rounded-lg border border-white/10 text-red-300/70 hover:text-red-300" aria-label="Revoke invite">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function TeamTab({ labelId, myRole, members, invites, onChanged }: any) {
  const canManage = labelCan(myRole, "manageTeam");
  const runInvite = useServerFn(createLabelInvite);
  const runSetRole = useServerFn(setMemberRole);
  const runRemove = useServerFn(removeMember);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<LabelRole>("manager");

  const invite = useMutation({
    mutationFn: () => runInvite({ data: { label_id: labelId, kind: "team", role: inviteRole, email: email || undefined } }),
    onSuccess: () => { toast.success("Invite created — copy the link below"); setEmail(""); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not create invite"),
  });
  const changeRole = useMutation({
    mutationFn: (v: { id: string; role: LabelRole }) => runSetRole({ data: { id: v.id, label_id: labelId, role: v.role } }),
    onSuccess: () => { toast.success("Role updated"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not update role"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => runRemove({ data: { id, label_id: labelId } }),
    onSuccess: () => { toast.success("Member removed"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove member"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {LABEL_ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-white/10 bg-[#0d0d18] p-3">
            <span className="text-xs font-bold" style={{ color: LABEL_ROLE_META[r].color }}>{LABEL_ROLE_META[r].label}</span>
            <p className="text-xs text-white/50 mt-1">{LABEL_ROLE_META[r].blurb}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#00E6FF]" /> Team seats</h3>
        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-3 min-w-0">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{m.profile?.display_name ?? "Team member"}</div>
                  <div className="text-[11px]" style={{ color: LABEL_ROLE_META[m.role as LabelRole].color }}>
                    {LABEL_ROLE_META[m.role as LabelRole].label}
                  </div>
                </div>
              </div>
              {canManage && m.role !== "owner" && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value as LabelRole })}
                    className="bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-xs"
                  >
                    {LABEL_ROLES.filter((r) => r !== "owner" || myRole === "owner").map((r) => (
                      <option key={r} value={r}>{LABEL_ROLE_META[r].label}</option>
                    ))}
                  </select>
                  <button onClick={() => remove.mutate(m.id)} className="p-2 rounded-lg border border-white/10 text-red-300/70 hover:text-red-300" aria-label="Remove member">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className="mt-5 pt-5 border-t border-white/10">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="flex-1 rounded-xl bg-black/50 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#00E6FF]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as LabelRole)}
                className="rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-sm"
              >
                {LABEL_ROLES.filter((r) => r !== "owner").map((r) => (
                  <option key={r} value={r}>{LABEL_ROLE_META[r].label}</option>
                ))}
              </select>
              <button
                onClick={() => invite.mutate()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-black bg-[#00E6FF]"
              >
                <Plus className="w-4 h-4" /> Invite
              </button>
            </div>
          </div>
        )}
      </div>

      {invites.filter((i: any) => i.kind === "team").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm uppercase tracking-widest text-white/40">Pending team invites</h3>
          {invites.filter((i: any) => i.kind === "team").map((i: any) => (
            <InviteRow key={i.id} invite={i} canManage={canManage} labelId={labelId} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function RosterTab({ labelId, myRole, roster, invites, onChanged }: any) {
  const canManage = labelCan(myRole, "manageRoster");
  const runInvite = useServerFn(createLabelInvite);
  const runStatus = useServerFn(setRosterStatus);

  const invite = useMutation({
    mutationFn: () => runInvite({ data: { label_id: labelId, kind: "artist" } }),
    onSuccess: () => { toast.success("Artist invite link created"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not create invite"),
  });
  const status = useMutation({
    mutationFn: (v: { id: string; status: "active" | "removed" }) => runStatus({ data: { id: v.id, label_id: labelId, status: v.status } }),
    onSuccess: () => { toast.success("Roster updated"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not update roster"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold flex items-center gap-2"><Disc3 className="w-4 h-4 text-[#FF00A6]" /> Roster</h3>
          {canManage && (
            <button onClick={() => invite.mutate()} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-semibold text-black bg-[#FF00A6]">
              <Plus className="w-4 h-4" /> Invite artist
            </button>
          )}
        </div>
        <div className="space-y-3">
          {roster.length === 0 && <p className="text-sm text-white/50">No artists on the roster yet.</p>}
          {roster.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <Link to="/artist/$id" params={{ id: r.artist_id }} className="flex items-center gap-3 min-w-0">
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.profile?.display_name ?? "Artist"}</div>
                  <div className="text-[11px] text-white/40 capitalize">{r.status}</div>
                </div>
              </Link>
              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  {r.status !== "active" && (
                    <button onClick={() => status.mutate({ id: r.id, status: "active" })} className="p-2 rounded-lg border border-white/10 text-emerald-300/80 hover:text-emerald-300" aria-label="Activate artist">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== "removed" && (
                    <button onClick={() => status.mutate({ id: r.id, status: "removed" })} className="p-2 rounded-lg border border-white/10 text-red-300/70 hover:text-red-300" aria-label="Remove artist">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {invites.filter((i: any) => i.kind === "artist").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm uppercase tracking-widest text-white/40">Pending artist invites</h3>
          {invites.filter((i: any) => i.kind === "artist").map((i: any) => (
            <InviteRow key={i.id} invite={i} canManage={canManage} labelId={labelId} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReleasesTab({ releases, myRole }: any) {
  const canEdit = labelCan(myRole, "editReleases");
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
      <h3 className="font-bold mb-1">Roster releases</h3>
      <p className="text-xs text-white/50 mb-4">
        {canEdit ? "You can view and edit releases from artists on the active roster." : "You have view-only access to roster releases."}
      </p>
      <div className="space-y-3">
        {releases.length === 0 && <p className="text-sm text-white/50">No releases from your roster yet.</p>}
        {releases.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
            {r.artwork_url ? (
              <img src={r.artwork_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{r.title}</div>
              <div className="text-xs text-white/50 truncate">{r.artist_name} · {r.release_type}</div>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${RELEASE_STATUS_STYLES[r.status] ?? "bg-white/10"}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ label, myRole, onChanged }: any) {
  const canEdit = labelCan(myRole, "editLabel");
  const runUpdate = useServerFn(updateLabel);
  const [name, setName] = useState(label.name ?? "");
  const [bio, setBio] = useState(label.bio ?? "");
  const [website, setWebsite] = useState(label.website ?? "");
  const [logo, setLogo] = useState(label.logo_url ?? "");

  const save = useMutation({
    mutationFn: () => runUpdate({ data: { id: label.id, name, bio, website, logo_url: logo } }),
    onSuccess: () => { toast.success("Label updated"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5 space-y-4">
      <h3 className="font-bold">Label settings</h3>
      {!canEdit && <p className="text-xs text-white/50">Only owners and managers can change these details.</p>}
      {[
        { label: "Name", value: name, set: setName },
        { label: "Website", value: website, set: setWebsite },
        { label: "Logo image URL", value: logo, set: setLogo },
      ].map((f) => (
        <div key={f.label}>
          <label className="block text-xs text-white/50 mb-1">{f.label}</label>
          <input
            disabled={!canEdit}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#00E6FF] disabled:opacity-50"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs text-white/50 mb-1">Bio</label>
        <textarea
          disabled={!canEdit}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#00E6FF] disabled:opacity-50"
        />
      </div>
      {canEdit && (
        <button onClick={() => save.mutate()} disabled={save.isPending} className="px-5 py-2.5 rounded-xl font-semibold text-black bg-[#00E6FF] disabled:opacity-40">
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
