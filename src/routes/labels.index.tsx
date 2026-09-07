import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Users, Disc3, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  listMyLabels, createLabel, listMyLabelMemberships, leaveLabel,
  LABEL_ROLE_META, type LabelRole,
} from "@/lib/labels.functions";

export const Route = createFileRoute("/labels/")({
  head: () => ({
    meta: [
      { title: "Labels & Teams — Tunevio" },
      { name: "description", content: "Run your record label on Tunevio: build a roster, invite your team and manage releases together." },
      { property: "og:title", content: "Labels & Teams — Tunevio" },
      { property: "og:description", content: "Run your record label on Tunevio: build a roster, invite your team and manage releases together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LabelsPage,
});

function LabelsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const fetchLabels = useServerFn(listMyLabels);
  const fetchMemberships = useServerFn(listMyLabelMemberships);
  const runCreate = useServerFn(createLabel);
  const runLeave = useServerFn(leaveLabel);
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const labels = useQuery({ queryKey: ["my-labels"], queryFn: () => fetchLabels(), enabled: !!auth.user });
  const memberships = useQuery({ queryKey: ["my-label-memberships"], queryFn: () => fetchMemberships(), enabled: !!auth.user });

  const create = useMutation({
    mutationFn: () => runCreate({ data: { name: name.trim() } }),
    onSuccess: () => {
      toast.success("Label created");
      setName("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["my-labels"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create label"),
  });

  const leave = useMutation({
    mutationFn: (id: string) => runLeave({ data: { id } }),
    onSuccess: () => {
      toast.success("You left the label");
      qc.invalidateQueries({ queryKey: ["my-label-memberships"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not leave label"),
  });

  if (!auth.user) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Labels & Teams</h1>
          <p className="text-white/60 mb-6">Sign in to create a label or join a team.</p>
          <Link to="/login" className="px-5 py-2.5 rounded-full font-semibold text-black bg-[#00E6FF]">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#C53DFF]" /> Labels & Teams
            </h1>
            <p className="text-white/60 mt-2">Build a roster, invite your team, and manage releases together.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-black bg-[#00E6FF] hover:brightness-110"
          >
            <Plus className="w-4 h-4" /> New label
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
            <label className="block text-sm text-white/60 mb-2">Label name</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blackwater Records"
                className="flex-1 rounded-xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-[#00E6FF]"
              />
              <button
                disabled={name.trim().length < 2 || create.isPending}
                onClick={() => create.mutate()}
                className="px-5 py-3 rounded-xl font-semibold text-black bg-[#FF00A6] disabled:opacity-40"
              >
                {create.isPending ? "Creating…" : "Create label"}
              </button>
            </div>
          </div>
        )}

        <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3">Labels you're on</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(labels.data ?? []).map((l) => {
            const meta = LABEL_ROLE_META[l.role as LabelRole];
            return (
              <Link
                key={l.label_id}
                to="/labels/$labelId"
                params={{ labelId: l.label_id }}
                className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5 hover:border-[#C53DFF]/60 transition"
              >
                <div className="flex items-center gap-3">
                  {l.logo_url ? (
                    <img src={l.logo_url} alt={`${l.name} logo`} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white/40" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold truncate">{l.name}</div>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-5 text-sm text-white/50">
                  <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {l.member_count} team</span>
                  <span className="inline-flex items-center gap-1.5"><Disc3 className="w-4 h-4" /> {l.roster_count} artists</span>
                </div>
              </Link>
            );
          })}
          {labels.isSuccess && (labels.data ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-white/50">
              You're not on a label yet. Create one, or accept an invite link from a label.
            </div>
          )}
        </div>

        {(memberships.data ?? []).length > 0 && (
          <>
            <h2 className="text-sm uppercase tracking-widest text-white/40 mt-10 mb-3">Labels signing you as an artist</h2>
            <div className="space-y-3">
              {(memberships.data ?? []).map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-white/50 capitalize">{m.status}</div>
                  </div>
                  {m.status !== "removed" && (
                    <button
                      onClick={() => leave.mutate(m.id)}
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white"
                    >
                      <LogOut className="w-4 h-4" /> Leave
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
