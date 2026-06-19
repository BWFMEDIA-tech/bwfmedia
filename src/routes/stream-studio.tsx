import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, LayoutDashboard, Video, Users, Compass, Calendar, MessageSquare,
  Bell, BarChart3, DollarSign, Settings, Mic, MicOff, Camera, CameraOff,
  MonitorUp, UserPlus, Share2, MoreHorizontal, Eye, Circle, Send, Smile,
  Heart, Flame, Music2, PartyPopper, Sparkles, Crown, Copy, Check,
  CheckCircle2, X as XIcon, Instagram, Facebook, MessageCircle, Mail,
  Headphones, Wifi, PhoneOff, ChevronRight, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import hostImg from "@/assets/stream-host.jpg";
import guestImg from "@/assets/stream-guest.jpg";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { startOrResumeStream, endStream } from "@/lib/streams.functions";
import { getMyActiveStream } from "@/lib/streams.functions";
import { broadcastStreamStarted } from "@/lib/live-broadcast.functions";
import { getLiveKitToken } from "@/lib/livekit.functions";
import { LiveStage, LiveStageContent, CameraPublishSync } from "@/components/stream/LiveStage";
import { LiveChat } from "@/components/stream/LiveChat";
import { useStageState } from "@/lib/useStageState";
import { ModeToggle } from "@/components/stream/ModeToggle";
import { StageRoom, AudienceRow } from "@/components/stream/StageRoom";
import { setHostTransferMode as setHostTransferModeFn } from "@/lib/stage.functions";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { RaiseHandPanel } from "@/components/stream/RaiseHandPanel";
import { BackstageQueue } from "@/components/stream/BackstageQueue";
import { GreenRoom } from "@/components/stream/GreenRoom";
import { supabase } from "@/integrations/supabase/client";
import { useStagePresence } from "@/lib/use-stage-presence";
import { PlayArenaView } from "@/routes/play.$room";
import { useArtistSubscription } from "@/hooks/useArtistSubscription";
import { MediaEngineProvider } from "@/lib/media-engine/MediaEngineContext";
import { LiveProductionDashboard } from "@/components/studio/LiveProductionDashboard";
import { IDENTITY_COLUMNS, effectiveIdentity } from "@/lib/host-identity";

export const Route = createFileRoute("/stream-studio")({
  head: () => ({
    meta: [
      { title: "BWF Live Studio — Stream Music Reviews & Podcasts" },
      { name: "description", content: "Premium live streaming studio for BWF Network. Host music reviews and podcasts with LiveKit-powered video, live chat, tips, and real-time analytics." },
      { property: "og:title", content: "BWF Live Studio" },
      { property: "og:description", content: "Cinematic dark-themed live streaming dashboard built for artists and creators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StreamStudioGuard,
});

function StreamStudioGuard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const artistSub = useArtistSubscription();
  const canBroadcast =
    auth.roles.includes("admin") ||
    auth.roles.includes("manager") ||
    auth.roles.includes("host") ||
    auth.roles.includes("artist");

  const isPrivileged =
    auth.roles.includes("admin") || auth.roles.includes("manager") || auth.roles.includes("host");
  const isArtistOnly = !isPrivileged && auth.roles.includes("artist");
  const needsTrial = isArtistOnly && !artistSub.isLoading && !artistSub.isActive;

  useEffect(() => {
    if (auth.loading || auth.rolesLoading) return;
    if (!auth.isAuthenticated) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!canBroadcast) {
      // Best-effort audit log of the blocked client-side access attempt.
      void supabase.from("stream_studio_access_log" as any).insert({
        user_id: auth.user?.id ?? null,
        reason: "non_broadcaster_client_route_access",
        route: "/stream-studio",
      } as any);
      navigate({ to: "/access-denied", replace: true });
      return;
    }
    if (needsTrial) {
      navigate({ to: "/artist/upgrade", replace: true });
    }
  }, [auth.loading, auth.rolesLoading, auth.isAuthenticated, canBroadcast, needsTrial, auth.user?.id, navigate]);

  if (auth.loading || auth.rolesLoading || !auth.isAuthenticated || !canBroadcast || (isArtistOnly && artistSub.isLoading) || needsTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07070d] text-white/60 text-sm">
        Checking permissions…
      </div>
    );
  }

  return <StreamStudio />;
}

/* ---------- Theme tokens ---------- */
const PURPLE = "#8b5cf6";
const PURPLE_GLOW = "rgba(139,92,246,0.45)";
const BLUE = "#3b82f6";

/* ---------- Sidebar ---------- */
const NAV: Array<{ icon: any; label: string; to: string; badge?: number }> = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin/dashboard" },
  { icon: Video, label: "Stream Now", to: "/stream-studio" },
  { icon: Users, label: "Artists", to: "/artists" },
  { icon: Compass, label: "Discover", to: "/videos" },
  { icon: Calendar, label: "Events", to: "/events" },
  { icon: MessageSquare, label: "Messages", to: "/messages" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: BarChart3, label: "Insights", to: "/admin/dashboard" },
  { icon: DollarSign, label: "Earnings", to: "/earnings" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const uid = auth.user?.id;
    if (!uid) { setUnreadMessages(0); setUnreadNotifs(0); return; }
    let cancelled = false;
    const load = async () => {
      const [{ count: msgCount }, { count: notifCount }] = await Promise.all([
        supabase.from("direct_messages").select("id", { count: "exact", head: true })
          .eq("recipient_id", uid).is("read_at", null),
        supabase.from("notifications").select("id", { count: "exact", head: true })
          .eq("user_id", uid).is("read_at", null),
      ]);
      if (cancelled) return;
      setUnreadMessages(msgCount ?? 0);
      setUnreadNotifs(notifCount ?? 0);
    };
    load();
    const ch = supabase
      .channel(`sidebar-counts-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${uid}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [auth.user?.id]);

  const badgeFor = (label: string): number | undefined => {
    if (label === "Messages") return unreadMessages || undefined;
    if (label === "Notifications") return unreadNotifs || undefined;
    return undefined;
  };
  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col gap-2 border-r border-white/5 bg-[#0a0a12] p-4">
      <Link to="/" className="flex items-center gap-2 px-2 py-3">
        <div className="text-2xl font-black tracking-tight">
          <span className="text-white">BWF</span>
        </div>
        <span className="text-[10px] tracking-[0.3em] text-white/50">NETWORK</span>
      </Link>

      <button
        className="mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})`,
          boxShadow: `0 8px 32px ${PURPLE_GLOW}`,
        }}
      >
        <Radio className="h-4 w-4 animate-pulse" />
        Go Live
      </button>

      <nav className="mt-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const badge = badgeFor(item.label) ?? item.badge;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/5 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" style={active ? { color: PURPLE } : undefined} />
                {item.label}
              </span>
              {badge ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: PURPLE }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Crown className="h-4 w-4" style={{ color: PURPLE }} />
          <span className="text-sm font-bold text-white">BWF PRO</span>
        </div>
        <p className="mb-3 text-xs text-white/50">Upgrade to unlock more tools and features.</p>
        <button
          className="w-full rounded-lg py-2 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
        >
          Upgrade Now
        </button>
      </div>

      <div className="flex items-center gap-2 px-2 pt-2 text-[10px] text-white/30">
        Powered by <span className="font-bold text-white/70">BWFNETWORK</span>
      </div>
    </aside>
  );
}

/* ---------- Video tile ---------- */
function VideoTile({ label, name, handle, gradient, image }: { label: string; name: string; handle: string; gradient: string; image?: string }) {
  return (
    <div className="stage-tile-glow relative aspect-video rounded-2xl p-[2px]">
      <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-[#0d0d18]">
      {image ? (
        <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" width={1024} height={1024} />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute left-3 top-3">
        <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold tracking-widest text-white backdrop-blur">
          {label}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2 backdrop-blur">
          <div
            className="h-8 w-8 rounded-full"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
          />
          <div>
            <div className="flex items-center gap-1 text-sm font-bold text-white">
              {name} <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />
            </div>
            <div className="text-[10px] text-white/60">{handle}</div>
          </div>
        </div>
        <div className="flex items-end gap-0.5">
          {[3, 5, 7, 9, 6].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full"
              style={{ height: `${h * 3}px`, background: `linear-gradient(to top, ${PURPLE}, ${BLUE})` }}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ---------- Stream controls ---------- */
function StreamControls() {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mr-2 flex items-center gap-2 px-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#22c55e" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
        </span>
        <div className="text-xs">
          <div className="font-semibold text-white">LiveKit</div>
          <div className="text-[10px] text-white/50">Excellent connection</div>
        </div>
      </div>
      <CtrlBtn icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((v) => !v)} active={muted} />
      <CtrlBtn icon={camOff ? CameraOff : Camera} label={camOff ? "Start Cam" : "Stop Cam"} onClick={() => setCamOff((v) => !v)} active={camOff} />
      <CtrlBtn icon={MonitorUp} label="Share Screen" />
      <CtrlBtn icon={UserPlus} label="Invite Guest" />
      <CtrlBtn icon={Settings} label="Settings" />
      <button
        onClick={() => toast.success("Stream ended")}
        className="ml-auto flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
      >
        <PhoneOff className="h-3.5 w-3.5" />
        End Stream
      </button>
    </div>
  );
}

function CtrlBtn({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/5",
        active ? "bg-white/10 text-white" : "text-white/80"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* ---------- Join requests / On deck / Invite ---------- */
const JOIN_REQUESTS = [
  { name: "Luna Luv", handle: "@itslunaluv", genre: "R&B / Soul", grad: "linear-gradient(135deg,#f472b6,#a855f7)" },
  { name: "Yung Maze", handle: "@yungmaze_", genre: "Hip Hop / Trap", grad: "linear-gradient(135deg,#3b82f6,#1e3a8a)" },
  { name: "Spade Sixx", handle: "@spadesixx", genre: "Hip Hop / Rap", grad: "linear-gradient(135deg,#10b981,#0f766e)" },
];

function JoinRequests() {
  return (
    <Panel title="JOIN REQUESTS" count={3} dismissible>
      <div className="flex flex-col gap-3">
        {JOIN_REQUESTS.map((r) => (
          <div key={r.handle} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: r.grad }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-white">
                {r.name}
                <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />
              </div>
              <div className="truncate text-[10px] text-white/50">
                {r.handle} · 🎵 {r.genre}
              </div>
            </div>
            <button className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: PURPLE }}>
              Accept
            </button>
            <button className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5">
              Decline
            </button>
          </div>
        ))}
      </div>
      <button className="mt-3 flex w-full items-center justify-between rounded-lg py-2 text-xs font-medium text-white/70 hover:text-white">
        View all requests <ChevronRight className="h-3 w-3" />
      </button>
    </Panel>
  );
}

function OnDeck() {
  const fallback = [
    { id: "1", artist_name: "Kairo", handle: "@kairo.wav", genre: "Alternative" },
    { id: "2", artist_name: "Jae Moné", handle: "@jaemone.music", genre: "R&B" },
    { id: "3", artist_name: "Treyvon", handle: "@treyvonofficial", genre: "Hip Hop" },
    { id: "4", artist_name: "Dolla Dreamz", handle: "@dolladreamzmusic", genre: "Trap / Rap" },
  ];
  const list = fallback;

  return (
    <Panel title="ON DECK" count={list.length} dismissible>
      <div className="flex flex-col gap-2.5">
        {list.map((a: typeof fallback[number], i: number) => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg px-1">
            <span className="w-4 text-xs font-bold text-white/40">{i + 1}</span>
            <div className="h-9 w-9 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{a.artist_name}</div>
              <div className="truncate text-[10px] text-white/50">{a.handle} · 🎵 {a.genre}</div>
            </div>
            <GripVertical className="h-4 w-4 text-white/30" />
          </div>
        ))}
      </div>
      <button className="mt-3 flex w-full items-center justify-between text-xs text-white/70 hover:text-white">
        View full queue <ChevronRight className="h-3 w-3" />
      </button>
    </Panel>
  );
}

function InviteGuest() {
  const [copied, setCopied] = useState(false);
  const link = "https://live.bwfnetwork.com/invite/bwf-host";
  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  };
  const shareText = "Join me live on BWF Network";
  const encodedLink = encodeURIComponent(link);
  const encodedText = encodeURIComponent(shareText);
  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };
  const shareTargets = [
    {
      Icon: XIcon,
      bg: "#000",
      label: "Share on X",
      onClick: () => openShare(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`),
    },
    {
      Icon: Instagram,
      bg: "linear-gradient(135deg,#f472b6,#a855f7)",
      label: "Copy link for Instagram",
      onClick: async () => {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied — paste it into Instagram");
      },
    },
    {
      Icon: MessageCircle,
      bg: "#22c55e",
      label: "Share on WhatsApp",
      onClick: () => openShare(`https://wa.me/?text=${encodedText}%20${encodedLink}`),
    },
    {
      Icon: Facebook,
      bg: "#1877f2",
      label: "Share on Facebook",
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`),
    },
    {
      Icon: MoreHorizontal,
      bg: "#374151",
      label: "More share options",
      onClick: async () => {
        if (typeof navigator !== "undefined" && (navigator as any).share) {
          try {
            await (navigator as any).share({ title: "BWF Network", text: shareText, url: link });
            return;
          } catch (e: any) {
            if (e?.name === "AbortError") return;
          }
        }
        await navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard");
      },
    },
  ];
  return (
    <Panel title="INVITE GUEST">
      <p className="mb-3 text-xs text-white/60">Invite an artist to join your stream. Share the link below.</p>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-1.5">
        <span className="flex-1 truncate px-2 text-[11px] text-white/80">{link}</span>
        <button onClick={copy} className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mb-3 text-[11px] text-white/50">Share via</div>
      <div className="mb-4 flex gap-2">
        {shareTargets.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={s.onClick}
            aria-label={s.label}
            title={s.label}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 hover:scale-105"
            style={{ background: s.bg }}
          >
            <s.Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="mb-1 text-[11px] text-white/50">Add via Email</div>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="artist@email.com"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />
        <button
          onClick={() => toast.success("Invite sent")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
        >
          <Send className="h-3 w-3" /> Send Invite
        </button>
      </div>
    </Panel>
  );
}

function Panel({ title, count, dismissible, children }: { title: string; count?: number; dismissible?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-white">{title}</span>
          {count !== undefined && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PURPLE }}>
              {count}
            </span>
          )}
        </div>
        {dismissible && <XIcon className="h-3.5 w-3.5 cursor-pointer text-white/40 hover:text-white" />}
      </div>
      {children}
    </div>
  );
}

/* ---------- Chat ---------- */
const CHAT_SEED = [
  { name: "BeatKing", verified: true, msg: "This is 🔥🔥🔥", time: "now", likes: 12 },
  { name: "Nina Strings", msg: "Love the vibe! JXHNNY coming with that real talk 💯", time: "now", likes: 0 },
  { name: "ProdByTee", verified: true, msg: "The beat selection is crazy!", time: "now", likes: 7 },
  { name: "Lyrik_Lee", msg: "He needs to drop this one ASAP!!! 🚀", time: "now", likes: 0 },
  { name: "QueenVee", tip: 20, msg: "Keep shining king! BWF showing real love! 💜", time: "now", isTip: true },
  { name: "JXHNNY RICH", artist: true, msg: "Appreciate y'all! Means everything 🙏💯", time: "now", likes: 15 },
];

function ChatPanel() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState(CHAT_SEED);
  const send = () => {
    if (!msg.trim()) return;
    setChat((c) => [...c, { name: "You", msg, time: "now", likes: 0 }]);
    setMsg("");
  };
  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d18] lg:w-[320px]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="text-xs font-bold tracking-widest text-white">LIVE CHAT</span>
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <Users className="h-3 w-3" /> 1.2K
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 rounded-lg p-2",
              c.isTip && "border border-purple-500/30 bg-purple-500/10"
            )}
          >
            <div className="h-7 w-7 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="font-bold text-white">{c.name}</span>
                {c.verified && <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />}
                {c.artist && <span className="rounded bg-purple-500/30 px-1 text-[9px] font-bold text-purple-200">Artist</span>}
                {c.isTip && <span className="text-[10px] text-purple-300">just donated <span className="font-bold">${c.tip}</span></span>}
                <span className="ml-auto text-[10px] text-white/40">{c.time}</span>
              </div>
              <div className="mt-0.5 text-xs text-white/80">{c.msg}</div>
            </div>
            <button className="self-start">
              <Heart className={cn("h-3.5 w-3.5", c.likes ? "fill-pink-500 text-pink-500" : "text-white/30")} />
              {c.likes ? <div className="text-[9px] text-white/60">{c.likes}</div> : null}
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Say something..."
            className="flex-1 bg-transparent py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
          />
          <Smile className="h-4 w-4 text-white/40" />
          <button onClick={send} className="rounded-md p-1.5" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}>
            <Send className="h-3 w-3 text-white" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 text-base">
            {["🔥", "💯", "👏", "🎵", "❤️", "😂"].map((e) => (
              <button key={e} className="rounded-md p-1 hover:bg-white/10">{e}</button>
            ))}
          </div>
          <button
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
          >
            <Sparkles className="h-3 w-3" /> Tip
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="border-t border-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-white">STREAM ANALYTICS</span>
          <BarChart3 className="h-3.5 w-3.5 text-white/40" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Eye} label="Viewers" value="1,245" color={BLUE} />
          <Stat icon={Heart} label="Likes" value="3,482" color="#ec4899" />
          <Stat icon={DollarSign} label="Donations" value="$245" color="#22c55e" />
          <Stat icon={Share2} label="Shares" value="127" color={PURPLE} />
          <Stat icon={Circle} label="Stream Time" value="01:23:47" color="#f59e0b" small />
        </div>
        <Sparkline />
      </div>
    </aside>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <Icon className="mb-1 h-3 w-3" style={{ color }} />
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[9px] text-white/50">{label}</div>
    </div>
  );
}

function Sparkline() {
  const pts = Array.from({ length: 40 }, (_, i) =>
    50 - Math.sin(i / 4) * 15 - (i / 40) * 25
  );
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"}${(i / 39) * 100},${y}`).join(" ");
  return (
    <div className="mt-3">
      <svg viewBox="0 0 100 60" className="h-16 w-full">
        <defs>
          <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={PURPLE} stopOpacity="0.6" />
            <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L100,60 L0,60 Z`} fill="url(#spark)" />
        <path d={d} fill="none" stroke={PURPLE} strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[9px] text-white/40">
        <span>00:00</span><span>00:20</span><span>00:40</span><span>01:00</span><span>01:20</span>
      </div>
    </div>
  );
}

/* ---------- Bottom on-air bar ---------- */
function OnAirBar() {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-white/5 bg-[#0a0a12] px-4 py-3 text-xs">
      <span className="flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 font-bold text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> ON AIR
      </span>
      <div>
        <div className="font-bold text-white">BWF Live: Unsigned Artist Review</div>
        <div className="text-[10px] text-white/50">Music Review Podcast</div>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
        <div>
          <div className="text-[10px] text-white/50">Current Guest</div>
          <div className="font-semibold text-white">JXHNNY RICH</div>
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <div className="h-8 w-8 rounded-full" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }} />
        <div>
          <div className="text-[10px] text-white/50">Next Up</div>
          <div className="font-semibold text-white">Kairo</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Meter label="Mic" color="#22c55e" />
        <Meter label="Cam" color="#22c55e" />
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
          <div>
            <div className="text-[10px] text-white/50">Network</div>
            <div className="font-semibold text-green-400">Good</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/50">{label}</div>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1 rounded-sm" style={{ height: `${6 + (i % 4) * 2}px`, background: i < 9 ? color : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Main ---------- */
function StreamStudio() {
  const [mode, setMode] = useState<"review" | "podcast">("review");
  const auth = useAuth();
  const nav = useNavigate();
  const startFn = useServerFn(startOrResumeStream);
  const endFn = useServerFn(endStream);
  const resumeFn = useServerFn(getMyActiveStream);
  const broadcastFn = useServerFn(broadcastStreamStarted);
  const tokenFn = useServerFn(getLiveKitToken);
  const [stream, setStream] = useState<{ id: string; room_name: string; title: string } | null>(null);
  const [lk, setLk] = useState<{ token: string; wsUrl: string } | null>(null);
  const [going, setGoing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [streamMode, setStreamMode] = useState<"broadcast" | "stage" | "play">("broadcast");
  const [stageLocked, setStageLocked] = useState(false);
  const [hostTransferMode, setHostTransferMode] = useState<"co_host" | "transfer">("co_host");
  const { participants, hands, queue } = useStageState(stream?.id ?? null);

  // Resolved host identity — brand name takes priority over personal name.
  const [selfIdentity, setSelfIdentity] = useState<{ display_name: string | null; avatar_url: string | null; is_brand: boolean }>({
    display_name: null, avatar_url: null, is_brand: false,
  });
  useEffect(() => {
    if (!auth.user?.id) { setSelfIdentity({ display_name: null, avatar_url: null, is_brand: false }); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select(IDENTITY_COLUMNS).eq("id", auth.user!.id).maybeSingle();
      if (cancelled) return;
      const eff = effectiveIdentity(data as any);
      setSelfIdentity({
        display_name: eff.display_name ?? auth.user!.user_metadata?.full_name ?? auth.user!.user_metadata?.name ?? null,
        avatar_url: eff.avatar_url ?? auth.user!.user_metadata?.avatar_url ?? null,
        is_brand: eff.is_brand,
      });
    })();
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  // Keep the host's presence row fresh while the studio tab is open.
  useStagePresence(stream?.id ?? null, auth.user?.id ?? null);

  // Auto-resume an in-progress stream after a page refresh. No notification
  // broadcast is sent on resume — only when starting a new stream.
  useEffect(() => {
    if (!auth.user || stream || lk) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await resumeFn();
        if (cancelled || !existing) return;
        const t = await tokenFn({ data: { roomName: existing.room_name } });
        if (cancelled) return;
        setStream({ id: existing.id, room_name: existing.room_name, title: existing.title });
        setLk({ token: t.token, wsUrl: t.wsUrl });
        setStartedAt(existing.started_at ?? new Date().toISOString());
        setStreamMode((existing.mode ?? "broadcast") as "broadcast" | "stage" | "play");
        setStageLocked(!!existing.stage_locked);
        setHostTransferMode(((existing as any).host_transfer_mode ?? "co_host") as "co_host" | "transfer");
        // Re-register stage participant. If ownership was transferred while we
        // were away, preserve the existing role (e.g. co_host) instead of
        // forcing back to host.
        const { data: existingRow } = await supabase
          .from("stage_participants")
          .select("stage_role")
          .eq("stream_id", existing.id)
          .eq("user_id", auth.user!.id)
          .maybeSingle();
        const resumeRole = existingRow?.stage_role
          ?? ((existing as any).host_id === auth.user!.id ? "host" : "co_host");
        await supabase.from("stage_participants").upsert(
          { stream_id: existing.id, user_id: auth.user!.id, stage_role: resumeRole },
          { onConflict: "stream_id,user_id" },
        );
        toast.success("Reconnected to your live stream");
      } catch (e: any) {
        console.warn("Could not auto-resume stream", e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  // Subscribe to stream row to track mode/lock changes
  useEffect(() => {
    if (!stream?.id) return;
    const ch = supabase
      .channel(`stream-row-${stream.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "streams", filter: `id=eq.${stream.id}` },
        (p) => {
          const r = p.new as any;
          setStreamMode((r.mode ?? "broadcast") as "broadcast" | "stage" | "play");
          setStageLocked(!!r.stage_locked);
          setHostTransferMode(((r as any).host_transfer_mode ?? "co_host") as "co_host" | "transfer");
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [stream?.id]);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) nav({ to: "/login" });
  }, [auth.loading, auth.isAuthenticated, nav]);

  const goLive = async () => {
    if (going) return;
    setGoing(true);
    try {
      const s = await startFn({ data: { title: "BWF Live: Unsigned Artist Review" } });
      const t = await tokenFn({ data: { roomName: s.room_name } });
      setStream(s);
      setLk({ token: t.token, wsUrl: t.wsUrl });
      setStartedAt(new Date().toISOString());
      // Register host as stage participant
      if (auth.user) {
        await supabase.from("stage_participants").upsert(
          { stream_id: s.id, user_id: auth.user.id, stage_role: "host" },
          { onConflict: "stream_id,user_id" },
        );
      }
      toast.success("You're live");
      // Fan-out notifications to all members + artists (non-blocking).
      broadcastFn({ data: { streamId: s.id } })
        .then((r: any) => {
          if (r?.notified) toast.message(`Notified ${r.notified} listeners`);
        })
        .catch((err: any) => console.error("broadcast failed", err));
    } catch (e: any) {
      toast.error(e?.message || "Failed to go live");
    } finally {
      setGoing(false);
    }
  };

  const stop = async () => {
    if (stream) {
      try { await endFn({ data: { streamId: stream.id } }); } catch {}
    }
    setLk(null);
    setStream(null);
    setStartedAt(null);
    setViewerCount(0);
    toast.success("Stream ended");
  };

  const copyInvite = () => {
    if (!stream) return toast.error("Go live first");
    const url = `${window.location.origin}/stream/${stream.room_name}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  if (auth.loading) return <div className="min-h-screen bg-[#050509]" />;

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <MediaEngineProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row">
            {/* Center column */}
            <div className="flex flex-1 flex-col gap-4">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
                <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold tracking-widest text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {lk ? "LIVE" : "OFFLINE"}
                </span>
                <div className="flex items-center gap-1.5 text-base font-bold text-white">
                  {stream?.title || "BWF Live: Unsigned Artist Review"}
                  <CheckCircle2 className="h-4 w-4" style={{ color: BLUE }} />
                </div>
                <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                  <button
                    onClick={() => setMode("review")}
                    className={cn("rounded px-2 py-1 text-[11px] font-medium", mode === "review" ? "bg-white/15 text-white" : "text-white/60")}
                  >
                    <Music2 className="mr-1 inline h-3 w-3" /> Music Review
                  </button>
                  <button
                    onClick={() => setMode("podcast")}
                    className={cn("rounded px-2 py-1 text-[11px] font-medium", mode === "podcast" ? "bg-white/15 text-white" : "text-white/60")}
                  >
                    <Headphones className="mr-1 inline h-3 w-3" /> Podcast
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs text-white/70">
                  {!lk && (
                    <button onClick={goLive} disabled={going} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}>
                      <Radio className="h-3.5 w-3.5" /> {going ? "Starting…" : "Go Live"}
                    </button>
                  )}
                  <button onClick={copyInvite} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 hover:bg-white/5">
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                  <button className="rounded-md border border-white/10 p-1.5 hover:bg-white/5">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Unified Live Production Dashboard — single MediaEngine.
                  Stage and Broadcast are independent source toggles. */}
              <LiveProductionDashboard
                participants={participants.map((p) => ({
                  id: p.user_id,
                  name: p.display_name ?? "Guest",
                  avatar: p.avatar_url,
                }))}
                onInvite={copyInvite}
                onEndBroadcast={stop}
              />

              {stream?.id && (
                <div className="flex items-center justify-end gap-2 px-1 text-[11px] text-white/60">
                  <span>Promotion mode:</span>
                  <select
                    value={hostTransferMode}
                    onChange={async (e) => {
                      const v = e.target.value as "co_host" | "transfer";
                      setHostTransferMode(v);
                      try {
                        await setHostTransferModeFn({ data: { streamId: stream.id, mode: v } });
                        toast.success(v === "transfer" ? "Ownership transfer enabled" : "Co-host mode enabled");
                      } catch (err: any) { toast.error(err?.message ?? "Failed"); }
                    }}
                    className="rounded-md border border-white/10 bg-[#0d0d18] px-2 py-1 text-white/80"
                  >
                    <option value="co_host">Co-Host (host stays)</option>
                    <option value="transfer">Transfer Ownership</option>
                  </select>
                </div>
              )}

              {/* SINGLE persistent LiveKit room. `streamMode` only swaps the
                  inner UI — the LiveKitRoom (mic publish + audio subscriptions)
                  stays mounted across mode toggles, so the microphone never
                  disconnects and we never trigger a reconnect storm / 429. */}
              <>
                {!lk && (
                  <div className="flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/60">
                      Click <button onClick={goLive} disabled={going} className="mx-2 rounded-md px-3 py-1.5 font-semibold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}>{going ? "Starting…" : "Go Live"}</button> to start streaming
                  </div>
                )}

                {lk && stream?.id && auth.user && (
                  <StageAudioShell
                    token={lk.token}
                    serverUrl={lk.wsUrl}
                    streamId={stream.id}
                    userId={auth.user.id}
                    isHost
                    onLeave={stop}
                    showHostTools
                  >
                    {/* Camera follows the UI mode WITHOUT touching the mic
                        or the room connection. */}
                    <CameraPublishSync publish={streamMode === "broadcast"} />

                    {streamMode === "broadcast" && (
                      <LiveStageContent
                        onEnd={stop}
                        onInvite={copyInvite}
                        hostImage={hostImg}
                        guestImage={guestImg}
                        onViewerCount={setViewerCount}
                        streamId={stream.id}
                        publish={false /* mic handled by StageAudioShell */}
                        showHostTools
                      />
                    )}

                    {streamMode === "play" && (
                      <PlayArenaView stream={{ id: stream.id, title: stream.title, host_id: auth.user.id }} showChat={false} />
                    )}

                    <StageRoom
                      streamId={stream.id}
                      participants={participants}
                      canManage
                      primaryHostId={auth.user.id}
                      hostTransferMode={hostTransferMode}
                      selfProfile={{ user_id: auth.user.id, display_name: selfIdentity.display_name, avatar_url: selfIdentity.avatar_url }}
                    />
                    <BattleArena
                      streamId={stream.id}
                      isHost
                      participants={participants.map((p) => ({
                        user_id: p.user_id,
                        display_name: p.display_name,
                        avatar_url: p.avatar_url,
                      }))}
                    />
                    {streamMode === "stage" && <AudienceRow participants={participants} />}
                  </StageAudioShell>
                )}
              </>

              {/* Three live panels */}
              <div className="grid gap-4 lg:grid-cols-3">
                <RaiseHandPanel hands={hands} streamId={stream?.id ?? null} />
                <BackstageQueue streamId={stream?.id ?? null} queue={queue} canManage />
                <GreenRoom streamId={stream?.id ?? null} participants={participants} />
              </div>

              {/* Invite link */}
              <InviteGuest />
            </div>

            <div className="flex flex-col gap-4">
              <LiveChat streamId={stream?.id ?? null} auth={auth} viewerCount={viewerCount} startedAt={startedAt} hostId={auth.user?.id ?? null} />
              <AudienceRow participants={participants} />
            </div>
          </div>
        </main>
      </div>
      </MediaEngineProvider>
    </div>
  );
}