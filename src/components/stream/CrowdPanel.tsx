import { useEffect, useMemo, useState } from "react";
import { Users, Crown, Mic, Headphones, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StageParticipant } from "@/lib/useStageState";

type AppRole = "admin" | "host" | "artist" | "moderator" | "member" | "listener";

const ROLE_STYLE: Record<AppRole, { label: string; cls: string; Icon: any }> = {
  admin:     { label: "Admin",     cls: "bg-rose-500/20 text-rose-300 border-rose-500/40",     Icon: Shield },
  host:      { label: "Host",      cls: "bg-violet-500/20 text-violet-200 border-violet-500/40", Icon: Crown },
  moderator: { label: "Mod",       cls: "bg-amber-500/20 text-amber-200 border-amber-500/40",  Icon: Shield },
  artist:    { label: "Artist",    cls: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40", Icon: Sparkles },
  member:    { label: "Member",    cls: "bg-sky-500/15 text-sky-200 border-sky-500/30",        Icon: Headphones },
  listener:  { label: "Listener",  cls: "bg-white/5 text-white/60 border-white/10",            Icon: Headphones },
};

const STAGE_RANK: Record<StageParticipant["stage_role"], number> = {
  host: 0, speaker: 1, green_room: 2, listener: 3,
};

function pickPrimaryRole(roles: AppRole[]): AppRole {
  const order: AppRole[] = ["admin", "host", "moderator", "artist", "member", "listener"];
  return order.find((r) => roles.includes(r)) ?? "listener";
}

export function CrowdPanel({
  participants,
  streamId,
  viewerCount,
}: {
  participants: StageParticipant[];
  streamId: string | null;
  viewerCount?: number;
}) {
  const [roleMap, setRoleMap] = useState<Map<string, AppRole[]>>(new Map());

  // Hydrate user roles for everyone in the crowd.
  useEffect(() => {
    const ids = [...new Set(participants.map((p) => p.user_id))].filter(Boolean);
    if (!ids.length) { setRoleMap(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (cancelled) return;
      const next = new Map<string, AppRole[]>();
      (data ?? []).forEach((r: any) => {
        const arr = next.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        next.set(r.user_id, arr);
      });
      setRoleMap(next);
    })();
    return () => { cancelled = true; };
  }, [participants.map((p) => p.user_id).join(",")]);

  const sorted = useMemo(
    () =>
      [...participants].sort((a, b) => {
        const r = STAGE_RANK[a.stage_role] - STAGE_RANK[b.stage_role];
        if (r !== 0) return r;
        return (a.display_name ?? "").localeCompare(b.display_name ?? "");
      }),
    [participants],
  );

  const total = viewerCount ?? participants.length;
  const onStage = participants.filter((p) => p.stage_role === "host" || p.stage_role === "speaker").length;

  return (
    <aside className="rounded-2xl border border-white/10 bg-[#0d0d18]/80 backdrop-blur p-4 flex flex-col gap-3 min-h-[200px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-violet-300" />
          <h3 className="text-sm font-semibold text-white tracking-wide">Crowd</h3>
          <span className="text-xs text-white/50">· {total} in the room</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
          <Mic size={12} className="text-violet-300" />
          {onStage} on stage
        </div>
      </header>

      {sorted.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">No one in the crowd yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {sorted.map((p) => {
            const roles = roleMap.get(p.user_id) ?? [];
            const primary = pickPrimaryRole(roles);
            const RoleMeta = ROLE_STYLE[primary];
            const onStageNow = p.stage_role === "host" || p.stage_role === "speaker";
            return (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition px-2.5 py-1.5"
              >
                <div className="relative">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {onStageNow && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d0d18]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate leading-tight">
                    {p.display_name ?? "Listener"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">
                    {p.stage_role === "host" ? "Host" : p.stage_role === "speaker" ? "Speaking" : p.stage_role === "green_room" ? "Green room" : "In crowd"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RoleMeta.cls}`}
                  title={RoleMeta.label}
                >
                  <RoleMeta.Icon size={10} />
                  {RoleMeta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}