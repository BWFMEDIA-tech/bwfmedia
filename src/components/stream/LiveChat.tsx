import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send, Smile, Heart, Users, BarChart3, Eye, DollarSign, Share2, Circle, Sparkles, CheckCircle2, Shield, Trash2, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";
import { TipModal } from "@/components/stream/TipModal";
import { useServerFn } from "@tanstack/react-start";
import { deleteMessage, timeoutUser, banUser } from "@/lib/moderation.functions";
import { IDENTITY_COLUMNS, effectiveIdentity } from "@/lib/host-identity";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

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
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d18] lg:w-[320px]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="text-xs font-bold tracking-widest text-white">LIVE CHAT</span>
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <Users className="h-3 w-3" /> {viewerCount || 0}
        </div>
      </div>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[420px]">
        {!streamId && (
          <div className="text-center text-xs text-white/40">Go live to start the chat.</div>
        )}
        {streamId && messages.length === 0 && (
          <div className="text-center text-xs text-white/40">Say hi to kick off the conversation 👋</div>
        )}
        {messages.map((c) => {
          const isTip = c.body.startsWith("💎 TIP");
          return (
          <div
            key={c.id}
            className={cn("flex gap-2 rounded-lg p-2", isTip && "border border-white/10")}
            style={isTip ? { background: `linear-gradient(135deg, ${PURPLE}33, ${BLUE}33)` } : undefined}
          >
            <Link to="/user/$id" params={{ id: c.user_id }} className="shrink-0">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="font-bold text-white">{c.display_name || "Anon"}</span>
                {c.user_id === auth.user?.id && <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />}
                {isTip && <Sparkles className="h-3 w-3" style={{ color: PURPLE }} />}
                <span className="ml-auto text-[10px] text-white/40">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className={cn("mt-0.5 break-words text-xs", isTip ? "font-semibold text-white" : "text-white/80")}>{c.body}</div>
              {canMod && c.user_id !== auth.user?.id && (
                <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
                  <Shield className="h-3 w-3" />
                  <button onClick={() => onDelete(c.id)} className="hover:text-white inline-flex items-center gap-0.5"><Trash2 className="h-3 w-3" />Delete</button>
                  <button onClick={() => onTimeout(c.user_id)} className="hover:text-white inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />Timeout</button>
                  <button onClick={() => onBan(c.user_id)} className="hover:text-red-400 inline-flex items-center gap-0.5"><Ban className="h-3 w-3" />Ban</button>
                </div>
              )}
            </div>
            <button className="self-start"><Heart className="h-3.5 w-3.5 text-white/30" /></button>
          </div>
          );
        })}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={auth.isAuthenticated ? "Say something..." : "Sign in to chat"}
            disabled={!auth.isAuthenticated || !streamId}
            className="flex-1 bg-transparent py-2 text-xs text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
          />
          <Smile className="h-4 w-4 text-white/40" />
          <button onClick={send} disabled={!streamId || sending} className="rounded-md p-1.5 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}>
            <Send className="h-3 w-3 text-white" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 text-base">
            {["🔥", "💯", "👏", "🎵", "❤️", "😂"].map((e) => (
              <button key={e} onClick={() => setMsg((m) => m + e)} className="rounded-md p-1 hover:bg-white/10">{e}</button>
            ))}
          </div>
          <button
            onClick={() => {
              if (!streamId) { toast.error("Stream not live yet"); return; }
              setShowTip(true);
            }}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
          >
            <Sparkles className="h-3 w-3" /> Tip
          </button>
        </div>
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-white">STREAM ANALYTICS</span>
          <BarChart3 className="h-3.5 w-3.5 text-white/40" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Eye} label="Viewers" value={String(viewerCount || 0)} color={BLUE} />
          <Stat icon={Heart} label="Messages" value={String(messages.length)} color="#ec4899" />
          <Stat icon={DollarSign} label="Tips" value={`$${(tipsTotalCents / 100).toFixed(0)}`} color="#22c55e" />
          <Stat icon={Sparkles} label="Tip Count" value={String(tipsCount)} color={PURPLE} />
          <Stat icon={Circle} label="Duration" value={durationLabel} color="#f59e0b" />
          <Stat icon={Circle} label="Status" value={streamId ? "LIVE" : "OFF"} color="#22c55e" />
        </div>
      </div>

      {showTip && streamId && (
        <TipModal streamId={streamId} auth={auth} onClose={() => setShowTip(false)} />
      )}
    </aside>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <Icon className="mb-1 h-3 w-3" style={{ color }} />
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[9px] text-white/50">{label}</div>
    </div>
  );
}