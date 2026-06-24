import { useEffect, useMemo, useState } from "react";
import { Users, Crown, Mic, Headphones, Shield, Sparkles, Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { StageParticipant } from "@/lib/useStageState";
import { SignedImg } from "@/components/ui/signed-img";

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
  host: 0, co_host: 1, speaker: 2, green_room: 3, listener: 4,
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
  const [filter, setFilter] = useState<"all" | "host" | "artist" | "moderator" | "listener">("all");
  const [query, setQuery] = useState("");

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

  const counts = useMemo(() => {
    const c = { all: sorted.length, host: 0, artist: 0, moderator: 0, listener: 0 };
    sorted.forEach((p) => {
      const primary = pickPrimaryRole(roleMap.get(p.user_id) ?? []);
      if (primary === "admin" || primary === "host") c.host += 1;
      else if (primary === "moderator") c.moderator += 1;
      else if (primary === "artist") c.artist += 1;
      else c.listener += 1;
    });
    return c;
  }, [sorted, roleMap]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((p) => {
      if (q && !(p.display_name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "all") return true;
      const primary = pickPrimaryRole(roleMap.get(p.user_id) ?? []);
      if (filter === "host") return primary === "host" || primary === "admin";
      if (filter === "moderator") return primary === "moderator";
      if (filter === "artist") return primary === "artist";
      return primary === "member" || primary === "listener";
    });
  }, [sorted, roleMap, filter, query]);

  const chips: Array<{ id: typeof filter; label: string; n: number }> = [
    { id: "all", label: "All", n: counts.all },
    { id: "host", label: "Hosts", n: counts.host },
    { id: "artist", label: "Artists", n: counts.artist },
    { id: "moderator", label: "Mods", n: counts.moderator },
    { id: "listener", label: "Listeners", n: counts.listener },
  ];

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

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search crowd"
          className="w-full rounded-lg border border-white/10 bg-black/40 pl-7 pr-7 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/40"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {chips.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2.5 py-1 border transition ${
                active
                  ? "bg-violet-500/25 border-violet-400/50 text-white"
                  : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/25"
              }`}
            >
              {c.label}
              <span className={`ml-1 ${active ? "text-violet-200" : "text-white/40"}`}>{c.n}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">
          {sorted.length === 0 ? "No one in the crowd yet." : "No one matches that filter."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {visible.map((p) => {
            const roles = roleMap.get(p.user_id) ?? [];
            const primary = pickPrimaryRole(roles);
            const RoleMeta = ROLE_STYLE[primary];
            const onStageNow = p.stage_role === "host" || p.stage_role === "speaker";
            return (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition px-2.5 py-1.5"
              >
                <Link to="/user/$id" params={{ id: p.user_id }} className="relative shrink-0">
                  {p.avatar_url ? (
                    <SignedImg src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {onStageNow && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d0d18]" />
                  )}
                </Link>
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