import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronRight, MessageSquare, Search, Send, UserPlus, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendDirectMessage, markConversationRead } from "@/lib/direct-messages.functions";
import { toast } from "sonner";
import { SignedImg } from "@/components/ui/signed-img";
import { ArtistStatusBeacon } from "@/components/artist/ArtistStatusBeacon";
import { isSoftwareKeyboardOpen } from "@/lib/mobile-keyboard";

const searchSchema = z.object({
  to: z.string().uuid().optional(),
});

export const Route = createFileRoute("/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — Tunevio" },
      { name: "description", content: "Direct messages with artists, hosts, and your network." },
      { property: "og:title", content: "Messages — Tunevio" },
      { property: "og:description", content: "Connect privately with Tunevio artists, hosts and your network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Conversation = {
  other: ProfileLite;
  last: Message;
  unread: number;
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

function MessagesPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const search = useSearch({ from: "/messages" });
  const sendFn = useServerFn(sendDirectMessage);
  const markReadFn = useServerFn(markConversationRead);

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeId, setActiveId] = useState<string | null>(search.to ?? null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [showNew, setShowNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) nav({ to: "/login" });
  }, [auth.loading, auth.isAuthenticated, nav]);

  // Load messages + subscribe
  useEffect(() => {
    if (!auth.user) return;
    const uid = auth.user.id;
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      const msgs = (data ?? []) as Message[];
      setMessages(msgs);
      // Fetch profiles for every "other" id
      const others = new Set<string>();
      msgs.forEach((m) => {
        const o = m.sender_id === uid ? m.recipient_id : m.sender_id;
        others.add(o);
      });
      if (search.to) others.add(search.to);
      if (others.size) {
        const { data: ps } = await supabase
          .from("public_profiles")
          .select("id, display_name, avatar_url")
          .in("id", [...others]);
        if (!cancelled) {
          const next: Record<string, ProfileLite> = {};
          (ps ?? []).forEach((p: any) => { next[p.id] = p; });
          setProfiles(next);
        }
      }
      setLoading(false);
    };
    fetchAll();

    const ch = supabase
      .channel(`dm-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${uid}` },
        fetchAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `sender_id=eq.${uid}` },
        fetchAll,
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [auth.user?.id, search.to]);

  // Group into conversations
  const conversations: Conversation[] = useMemo(() => {
    if (!auth.user) return [];
    const uid = auth.user.id;
    const map = new Map<string, Conversation>();
    for (const m of messages) {
      const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id;
      const other = profiles[otherId] ?? { id: otherId, display_name: null, avatar_url: null };
      const existing = map.get(otherId);
      const isUnread = m.recipient_id === uid && !m.read_at;
      if (!existing) {
        map.set(otherId, { other, last: m, unread: isUnread ? 1 : 0 });
      } else {
        existing.last = m;
        if (isUnread) existing.unread += 1;
      }
    }
    // If a ?to=uuid is set but no messages yet, add a placeholder convo
    if (search.to && !map.has(search.to)) {
      const other = profiles[search.to] ?? { id: search.to, display_name: null, avatar_url: null };
      map.set(search.to, {
        other,
        last: { id: "new", sender_id: uid, recipient_id: search.to, body: "", created_at: new Date().toISOString(), read_at: null },
        unread: 0,
      });
    }
    return [...map.values()].sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages, profiles, auth.user?.id, search.to]);

  const activeMessages = useMemo(() => {
    if (!auth.user || !activeId) return [];
    const uid = auth.user.id;
    return messages.filter(
      (m) =>
        (m.sender_id === uid && m.recipient_id === activeId) ||
        (m.sender_id === activeId && m.recipient_id === uid),
    );
  }, [messages, activeId, auth.user?.id]);

  const scrollToLatest = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToLatest();
  }, [activeMessages.length, activeId]);

  // Focus the composer when a conversation opens
  useEffect(() => {
    if (!activeId) return;
    const t = window.setTimeout(() => composerRef.current?.focus({ preventScroll: true }), 120);
    return () => window.clearTimeout(t);
  }, [activeId]);

  // Track the visible viewport so the pop-up composer stays above the phone keyboard.
  // Only override the layout while the keyboard is actually open; when it closes we
  // clear the override (back to 100dvh) and undo any scroll offset iOS left behind,
  // which is what caused the blank space and off-screen messages.
  const [vv, setVv] = useState<{ h: number; top: number; left: number; w: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    let raf = 0;
    const update = () => {
      raf = 0;
      // Layout viewport height: visualViewport.pageTop + height ≈ innerHeight, but
      // innerHeight is the stable reference on iOS Safari, PWA and Capacitor.
      const layoutH = window.innerHeight;
      const visibleH = v ? v.height : layoutH;
      const keyboardOpen = isSoftwareKeyboardOpen(layoutH, visibleH);
      if (keyboardOpen && v) {
        // Follow the visible area on both axes so the pop-up stays centered even if
        // iOS pans the view sideways while bringing the caret into view.
        setVv({ h: v.height, top: v.offsetTop, left: v.offsetLeft, w: v.width });
        scrollToLatest();
      } else {
        // Keyboard closed (or never opened): restore the full-screen layout.
        setVv(null);
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    if (v) {
      v.addEventListener("resize", schedule);
      v.addEventListener("scroll", schedule);
    }
    // Capacitor iOS / older WKWebView can miss visualViewport events; window resize
    // still fires when the keyboard changes the view size there.
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      if (v) {
        v.removeEventListener("resize", schedule);
        v.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  // Lock page scroll behind the mobile pop-up. `overflow: hidden` alone does not stop
  // iOS Safari/WKWebView from scrolling and side-panning the page when the keyboard
  // opens, which pushed the pop-up up and to the right. Pinning the body in place
  // removes that page movement; the scroll position is restored when it closes.
  useEffect(() => {
    if (!activeId || window.matchMedia("(min-width: 768px)").matches) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      html.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [activeId]);

  // Auto-grow the composer
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [body]);

  // Mark conversation read when opened
  useEffect(() => {
    if (!activeId || !auth.user) return;
    const hasUnread = activeMessages.some((m) => m.recipient_id === auth.user!.id && !m.read_at);
    if (hasUnread) {
      markReadFn({ data: { otherUserId: activeId } }).catch(() => {});
    }
  }, [activeId, activeMessages, auth.user?.id, markReadFn]);

  // Search users
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${q}%`)
        .neq("id", auth.user?.id ?? "")
        .limit(20);
      if (!cancelled) setSearchResults((data ?? []) as ProfileLite[]);
    })();
    return () => { cancelled = true; };
  }, [searchQ, auth.user?.id]);

  const handleSend = async () => {
    if (!activeId || !body.trim() || sending) return;
    const text = body.trim();
    setSending(true);
    setBody("");
    try {
      await sendFn({ data: { recipientId: activeId, body: text } });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
      setBody(text);
    } finally {
      setSending(false);
    }
  };

  const openConversation = (otherId: string) => {
    setActiveId(otherId);
    setShowNew(false);
    nav({ to: "/messages", search: { to: otherId }, replace: true });
  };

  // Close the open thread and go back to the conversation list.
  const closeConversation = () => {
    setActiveId(null);
    setShowNew(false);
    setSearchQ("");
    nav({ to: "/messages", search: {}, replace: true });
  };
  if (auth.loading || !auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
        Loading…
      </div>
    );
  }

  const activeProfile = activeId ? (profiles[activeId] ?? null) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-bone">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6 text-brand-cyan" /> Messages
          </h1>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs transition hover:border-brand-cyan/50 hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4" /> New message
          </button>
        </div>

        <div className="grid h-[70vh] min-h-[500px] grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className={`flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] ${activeId ? "hidden md:flex" : "flex"}`}>
            {showNew && (
              <div className="border-b border-white/10 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full rounded-full border border-white/10 bg-black/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-cyan/60"
                  />
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProfiles((prev) => ({ ...prev, [p.id]: p }));
                        openConversation(p.id);
                        setSearchQ("");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
                    >
                      <Avatar profile={p} />
                      <span className="text-sm">{p.display_name || "Unknown user"}</span>
                    </button>
                  ))}
                  {searchQ.length >= 2 && searchResults.length === 0 && (
                    <p className="px-2 py-3 text-xs text-white/40">No users found.</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-xs text-white/40">Loading…</p>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/50">
                  No conversations yet.<br />Tap "New message" to start one.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.other.id}
                    onClick={() => openConversation(c.other.id)}
                    className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 ${activeId === c.other.id ? "bg-white/10" : ""}`}
                  >
                    <Avatar profile={c.other} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.other.display_name || "Unknown user"}</span>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-white/50">{c.last.body || "Start the conversation"}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Thread */}
          <section
            style={activeId && vv ? ({ "--vvh": `${vv.h}px`, "--vvt": `${vv.top}px` } as CSSProperties) : undefined}
            className={`flex-col overflow-hidden bg-black md:bg-white/[0.03] ${activeId ? "fixed inset-x-0 top-[var(--vvt,0px)] z-[60] flex h-[var(--vvh,100dvh)] animate-in slide-in-from-bottom-6 fade-in duration-200 md:static md:z-auto md:h-auto md:animate-none md:rounded-3xl md:border md:border-white/10 md:shadow-2xl md:shadow-brand-blue/10" : "hidden md:flex md:rounded-3xl md:border md:border-white/10"}`}
          >
            {activeId ? (
              <>
                <header className="relative flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3">
                  <button
                    onClick={closeConversation}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-brand-cyan/60 hover:bg-white/10 md:hidden"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-2 md:justify-start">
                    <Avatar profile={activeProfile ?? { id: activeId, display_name: null, avatar_url: null }} />
                    <h2 className="min-w-0 truncate text-lg font-semibold">{activeProfile?.display_name || "Unknown user"}</h2>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                  </div>
                  <button
                    onClick={closeConversation}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 transition hover:border-brand-cyan/60 hover:bg-white/10 hover:text-white"
                    aria-label="Close conversation"
                    title="Close conversation"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </header>
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                  {activeMessages.length === 0 ? (
                    <p className="mt-12 text-center text-xs text-white/40">No messages yet. Say hi 👋</p>
                  ) : (
                    activeMessages.map((m, i) => {
                      const mine = m.sender_id === auth.user!.id;
                      const prev = activeMessages[i - 1];
                      const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
                      const senderProfile = mine
                        ? { id: auth.user!.id, display_name: auth.user!.user_metadata?.display_name ?? null, avatar_url: auth.user!.user_metadata?.avatar_url ?? null }
                        : (activeProfile ?? { id: m.sender_id, display_name: null, avatar_url: null });
                      return (
                        <div key={m.id}>
                          {showDay && (
                            <p className="py-3 text-center text-xs font-medium text-white/40">{dayLabel(m.created_at)}</p>
                          )}
                          <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine && <Avatar profile={senderProfile} />}
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-lg ${
                                mine
                                  ? "rounded-br-md bg-gradient-to-r from-brand-cyan to-brand-blue text-white shadow-brand-blue/20"
                                  : "rounded-bl-md border border-white/10 bg-white/10 text-bone"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-white/40"}`}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              </p>
                            </div>
                            {mine && <Avatar profile={senderProfile} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); composerRef.current?.focus(); }}
                  className="shrink-0 border-t border-white/10 bg-black/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:bg-transparent"
                >
                  <div className="flex items-end gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-4 pr-1.5 transition focus-within:border-brand-cyan/60">
                    <textarea
                      ref={composerRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onFocus={() => { window.setTimeout(() => scrollToLatest(true), 250); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Write a message…"
                      rows={1}
                      maxLength={4000}
                      enterKeyHint="send"
                      className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-white/40 md:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!body.trim() || sending}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue text-white transition hover:opacity-90 disabled:opacity-40"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-white/40">
                Select a conversation
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile }: { profile: ProfileLite }) {
  const initial = (profile.display_name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">{profile.avatar_url ? <SignedImg src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">{initial}</div>}<ArtistStatusBeacon userId={profile.id} /></div>
  );
}
