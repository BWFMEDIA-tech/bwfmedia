import { useEffect, useRef, useState } from "react";
import { Send, Smile, Heart, Users, BarChart3, Eye, DollarSign, Share2, Circle, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

type ChatRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
};

export function LiveChat({ streamId, auth }: { streamId: string | null; auth: AuthState }) {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const profileCache = useRef<Record<string, string>>({});
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
        const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
        profs?.forEach((p: any) => { profileCache.current[p.id] = p.display_name; });
      }
      setMessages(data.map((r: any) => ({ ...r, display_name: profileCache.current[r.user_id] ?? "Anon" })));
    })();

    const channel = supabase
      .channel(`stream-chat-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_messages", filter: `stream_id=eq.${streamId}` },
        async (payload) => {
          const row = payload.new as any;
          let name = profileCache.current[row.user_id];
          if (!name) {
            const { data } = await supabase.from("profiles").select("display_name").eq("id", row.user_id).maybeSingle();
            name = data?.display_name ?? "Anon";
            profileCache.current[row.user_id] = name as string;
          }
          setMessages((cur) => [...cur, { ...row, display_name: name }]);
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [streamId]);

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
          <Users className="h-3 w-3" /> {messages.length}
        </div>
      </div>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[420px]">
        {!streamId && (
          <div className="text-center text-xs text-white/40">Go live to start the chat.</div>
        )}
        {streamId && messages.length === 0 && (
          <div className="text-center text-xs text-white/40">Say hi to kick off the conversation 👋</div>
        )}
        {messages.map((c) => (
          <div key={c.id} className="flex gap-2 rounded-lg p-2">
            <div className="h-7 w-7 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="font-bold text-white">{c.display_name || "Anon"}</span>
                {c.user_id === auth.user?.id && <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />}
                <span className="ml-auto text-[10px] text-white/40">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-0.5 break-words text-xs text-white/80">{c.body}</div>
            </div>
            <button className="self-start"><Heart className="h-3.5 w-3.5 text-white/30" /></button>
          </div>
        ))}
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
            onClick={() => toast.info("Tips coming soon")}
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
          <Stat icon={Eye} label="Viewers" value="—" color={BLUE} />
          <Stat icon={Heart} label="Messages" value={String(messages.length)} color="#ec4899" />
          <Stat icon={DollarSign} label="Tips" value="$0" color="#22c55e" />
          <Stat icon={Share2} label="Shares" value="—" color={PURPLE} />
          <Stat icon={Circle} label="Status" value={streamId ? "LIVE" : "OFF"} color="#f59e0b" />
        </div>
      </div>
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