import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Send,
  Smile,
  Heart,
  Users,
  BarChart3,
  Eye,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Shield,
  Trash2,
  Clock,
  Ban,
  Radio,
  ChevronDown,
  MessageCircle,
  Zap,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";
import { TipModal } from "@/components/stream/TipModal";
import { useServerFn } from "@tanstack/react-start";
import { deleteMessage, timeoutUser, banUser } from "@/lib/moderation.functions";
import { IDENTITY_COLUMNS, effectiveIdentity } from "@/lib/host-identity";
import { RankBadge } from "@/components/rank/RankBadge";

// BWF Immersive Cinema palette
const PURPLE = "#C53DFF";
const PINK = "#FF00A6";
const CYAN = "#00E6FF";
const BLUE = "#004BFF";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";

type ChatRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function LiveChat({
  streamId,
  auth,
  viewerCount = 0,
  startedAt = null,
  hostId = null,
}: {
  streamId: string | null;
  auth: AuthState;
  viewerCount?: number;
  startedAt?: string | null;
  hostId?: string | null;
}) {
  const delFn = useServerFn(deleteMessage);
  const toFn = useServerFn(timeoutUser);
  const banFn = useServerFn(banUser);
  const canMod =
    auth.roles.includes("admin") || auth.roles.includes("moderator") ||
    (!!hostId && auth.user?.id === hostId);

  const onDelete = async (id: string) => {
    if (!streamId) return;
    try { await delFn({ data: { messageId: id, streamId } }); toast.success("Message removed"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const onTimeout = async (uid: string) => {
    if (!streamId) return;
    try { await toFn({ data: { streamId, targetUserId: uid, minutes: 10 } }); toast.success("User timed out 10m"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const onBan = async (uid: string) => {
    if (!confirm("Ban this user from the platform?")) return;
    try { await banFn({ data: { targetUserId: uid, reason: "chat abuse" } }); toast.success("User banned"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [tipsTotalCents, setTipsTotalCents] = useState(0);
  const [tipsCount, setTipsCount] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [durationLabel, setDurationLabel] = useState("00:00");
  const profileCache = useRef<Record<string, { display_name: string; avatar_url: string | null }>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // Load history + realtime
  useEffect(() => {
    if (!streamId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("stream_messages")
        .select("id, user_id, body, created_at")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled || !data) return;
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select(IDENTITY_COLUMNS).in("id", userIds);
        profs?.forEach((p: any) => {
          const eff = effectiveIdentity(p);
          profileCache.current[p.id] = { display_name: eff.display_name ?? "Anon", avatar_url: eff.avatar_url };
        });
      }
      setMessages(data.map((r: any) => ({ ...r, display_name: profileCache.current[r.user_id]?.display_name ?? "Anon", avatar_url: profileCache.current[r.user_id]?.avatar_url ?? null })));
    })();

    const channelName = `stream-chat-${streamId}-${Math.random().toString(36).slice(2, 10)}`;
    console.log(`[LiveChat] MOUNT streamId=${streamId} channel=${channelName}`);
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_messages", filter: `stream_id=eq.${streamId}` },
        async (payload) => {
          const row = payload.new as any;
          let cached = profileCache.current[row.user_id];
          if (!cached) {
            const { data } = await supabase.from("profiles").select(IDENTITY_COLUMNS).eq("id", row.user_id).maybeSingle();
            const eff = effectiveIdentity(data as any);
            cached = { display_name: eff.display_name ?? "Anon", avatar_url: eff.avatar_url };
            profileCache.current[row.user_id] = cached;
          }
          setMessages((cur) => [...cur, { ...row, display_name: cached.display_name, avatar_url: cached.avatar_url }]);
        })
      .subscribe();
    return () => {
      console.log(`[LiveChat] UNMOUNT streamId=${streamId} channel=${channelName}`);
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Tips: initial load + realtime
  useEffect(() => {
    if (!streamId) { setTipsTotalCents(0); setTipsCount(0); return; }
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase.rpc("get_stream_tip_totals", { p_stream_id: streamId });
      if (cancelled || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      setTipsCount(Number(row?.tip_count ?? 0));
      setTipsTotalCents(Number(row?.total_cents ?? 0));
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [streamId]);

  // Live duration ticker
  useEffect(() => {
    if (!startedAt) { setDurationLabel("00:00"); return; }
    const tick = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      const s = Math.max(0, Math.floor(ms / 1000));
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      setDurationLabel(
        hh > 0
          ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
          : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!msg.trim() || !streamId || !auth.user || sending) return;
    if (!auth.isAuthenticated) { toast.error("Sign in to chat"); return; }
    setSending(true);
    const body = msg.trim();
    setMsg("");
    const { error } = await supabase.from("stream_messages").insert({
      stream_id: streamId,
      user_id: auth.user.id,
      body,
    });
    if (error) toast.error(error.message);
    setSending(false);
  };

  return (
    <aside
      className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_60px_-25px_rgba(197,61,255,0.55)] lg:w-[340px] [font-family:'Space_Grotesk',ui-sans-serif,system-ui]"
      style={{
        background:
          "radial-gradient(80% 50% at 0% 0%, rgba(197,61,255,0.18), transparent 60%), radial-gradient(80% 50% at 100% 100%, rgba(0,75,255,0.18), transparent 60%), #07070f",
      }}
    >
      {/* subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px, 32px 32px",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="relative grid h-8 w-8 place-items-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
              boxShadow: `0 0 18px ${PURPLE}80`,
            }}
          >
            <MessageCircle className="h-4 w-4 text-white" />
            {streamId && (
              <>
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: PINK, boxShadow: `0 0 10px ${PINK}` }}
                />
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full opacity-70"
                  style={{ background: PINK }}
                />
              </>
            )}
          </div>
          <div className="leading-tight">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: streamId ? PINK : "rgba(255,255,255,0.4)" }}
            >
              {streamId ? "● LIVE CHAT" : "OFF AIR"}
            </div>
            <div className="text-[11px] text-white/50">Real-time crowd</div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-white"
          style={{ boxShadow: `inset 0 0 10px ${CYAN}22` }}
        >
          <Eye className="h-3 w-3" style={{ color: CYAN }} />
          <span className="tabular-nums">{viewerCount || 0}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto px-3 py-4 max-h-[460px] [scrollbar-width:thin] [scrollbar-color:rgba(197,61,255,0.4)_transparent]"
      >
        {!streamId && (
          <EmptyState
            icon={<Radio className="h-6 w-6" style={{ color: PURPLE }} />}
            title="Off the air"
            subtitle="Go live to ignite the chat."
          />
        )}
        {streamId && messages.length === 0 && (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" style={{ color: PINK }} />}
            title="Say hi 👋"
            subtitle="Kick off the conversation. The crowd is listening."
          />
        )}
        <div className="space-y-2.5">
        {messages.map((c) => {
          const isTip = c.body.startsWith("💎 TIP");
          const isHost = !!hostId && c.user_id === hostId;
          const isSelf = c.user_id === auth.user?.id;
          return (
          <div
            key={c.id}
            className={cn(
              "group relative flex gap-2.5 rounded-xl p-2.5 transition",
              isTip
                ? "border border-transparent"
                : "border border-transparent hover:border-white/10 hover:bg-white/[0.03]",
            )}
            style={
              isTip
                ? {
                    background: `linear-gradient(135deg, ${PURPLE}26, ${PINK}26 50%, ${CYAN}1a)`,
                    boxShadow: `0 0 20px -8px ${PURPLE}80, inset 0 0 18px ${PINK}1f`,
                    border: `1px solid ${PURPLE}55`,
                  }
                : undefined
            }
          >
            <Link to="/user/$id" params={{ id: c.user_id }} className="relative shrink-0">
              <div
                className="rounded-full p-[1.5px]"
                style={{
                  background: isHost
                    ? `conic-gradient(${PURPLE}, ${PINK}, ${CYAN}, ${PURPLE})`
                    : isSelf
                      ? `linear-gradient(135deg, ${CYAN}, ${BLUE})`
                      : "rgba(255,255,255,0.12)",
                }}
              >
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full border border-[#07070f] object-cover"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-full border border-[#07070f]"
                    style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
                  />
                )}
              </div>
              {isHost && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-[#07070f]"
                  style={{ background: PURPLE, boxShadow: `0 0 10px ${PURPLE}` }}
                  title="Host"
                >
                  <Crown className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="truncate font-bold text-white">{c.display_name || "Anon"}</span>
                <RankBadge userId={c.user_id} size="xs" />
                {isHost && (
                  <span
                    className="rounded px-1 py-px text-[8px] font-black uppercase tracking-widest text-white"
                    style={{ background: PURPLE, boxShadow: `0 0 10px ${PURPLE}80` }}
                  >
                    HOST
                  </span>
                )}
                {isSelf && !isHost && (
                  <CheckCircle2 className="h-3 w-3" style={{ color: CYAN }} />
                )}
                {isTip && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[8px] font-black uppercase tracking-widest text-white"
                    style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
                  >
                    <Zap className="h-2.5 w-2.5" />
                    TIP
                  </span>
                )}
                <span className="ml-auto text-[10px] tabular-nums text-white/40">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 break-words text-[13px] leading-snug",
                  isTip ? "font-semibold text-white" : "text-white/85",
                )}
              >
                {c.body}
              </div>
              {canMod && !isSelf && (
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/30 opacity-0 transition group-hover:opacity-100">
                  <Shield className="h-3 w-3" />
                  <button onClick={() => onDelete(c.id)} className="inline-flex items-center gap-0.5 hover:text-white">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                  <button onClick={() => onTimeout(c.user_id)} className="inline-flex items-center gap-0.5 hover:text-white">
                    <Clock className="h-3 w-3" />
                    Timeout
                  </button>
                  <button onClick={() => onBan(c.user_id)} className="inline-flex items-center gap-0.5 hover:text-red-400">
                    <Ban className="h-3 w-3" />
                    Ban
                  </button>
                </div>
              )}
            </div>
            <button
              className="self-start opacity-0 transition group-hover:opacity-100"
              title="React"
            >
              <Heart className="h-3.5 w-3.5 text-white/40 hover:text-pink-400" />
            </button>
          </div>
          );
        })}
        </div>
      </div>
      {/* Composer */}
      <div className="relative border-t border-white/10 bg-black/30 p-3 backdrop-blur">
        <div
          className="group mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] pl-3 pr-1.5 transition focus-within:border-transparent"
          style={{
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02)`,
          }}
        >
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, 280))}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={auth.isAuthenticated ? "Drop a message…" : "Sign in to chat"}
            disabled={!auth.isAuthenticated || !streamId}
            className="flex-1 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
          />
          {msg.length > 0 && (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                msg.length > 240 ? "text-pink-400" : "text-white/30",
              )}
            >
              {280 - msg.length}
            </span>
          )}
          <Smile className="h-4 w-4 text-white/40" />
          <button
            onClick={send}
            disabled={!streamId || sending || !msg.trim()}
            className="grid h-8 w-8 place-items-center rounded-xl text-white transition active:scale-95 disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
              boxShadow: msg.trim() ? `0 0 18px ${PURPLE}80` : "none",
            }}
            title="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 text-base">
            {["🔥", "💯", "👏", "🎵", "❤️", "😂"].map((e) => (
              <button
                key={e}
                onClick={() => setMsg((m) => (m + e).slice(0, 280))}
                className="rounded-lg p-1 transition hover:scale-125 hover:bg-white/10"
                title={`Add ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (!streamId) {
                toast.error("Stream not live yet");
                return;
              }
              setShowTip(true);
            }}
            className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE} 60%, ${BLUE})`,
              boxShadow: `0 0 22px -4px ${PINK}aa`,
            }}
          >
            <Sparkles className="h-3 w-3 transition group-hover:rotate-12" />
            Tip
          </button>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" style={{ color: CYAN }} />
            <span
              className="text-[11px] font-black uppercase tracking-[0.28em] text-white"
              style={{ textShadow: `0 0 12px ${CYAN}55` }}
            >
              Stream Pulse
            </span>
          </div>
          <span
            className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={
              streamId
                ? {
                    borderColor: `${GREEN}55`,
                    color: GREEN,
                    background: `${GREEN}1a`,
                  }
                : {
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)",
                  }
            }
          >
            {streamId ? "● Live" : "Off"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Eye} label="Viewers" value={String(viewerCount || 0)} color={CYAN} />
          <Stat icon={MessageCircle} label="Messages" value={String(messages.length)} color={PINK} />
          <Stat icon={DollarSign} label="Tips" value={`$${(tipsTotalCents / 100).toFixed(0)}`} color={GREEN} />
          <Stat icon={Sparkles} label="Tippers" value={String(tipsCount)} color={PURPLE} />
          <Stat icon={Clock} label="Duration" value={durationLabel} color={AMBER} mono />
          <Stat
            icon={Radio}
            label="Status"
            value={streamId ? "LIVE" : "OFF"}
            color={streamId ? GREEN : "#6b7280"}
            pulse={!!streamId}
          />
        </div>
      </div>

      {showTip && streamId && (
        <TipModal streamId={streamId} auth={auth} onClose={() => setShowTip(false)} />
      )}
    </aside>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
  mono,
  pulse,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  mono?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/10 p-2.5 transition hover:border-white/20"
      style={{
        background: `radial-gradient(120% 80% at 0% 0%, ${color}1a, transparent 60%), rgba(255,255,255,0.02)`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", pulse && "animate-pulse")} style={{ color }} />
        <div
          className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/50"
        >
          {label}
        </div>
      </div>
      <div
        className={cn(
          "mt-1 text-base font-black leading-none text-white",
          mono && "tabular-nums",
        )}
        style={{ textShadow: `0 0 14px ${color}55` }}
      >
        {value}
      </div>
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-6 text-center">
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 70%)",
        }}
      >
        {icon}
      </div>
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="max-w-[200px] text-[11px] leading-relaxed text-white/40">{subtitle}</div>
    </div>
  );
}