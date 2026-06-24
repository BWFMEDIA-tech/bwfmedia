import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageSquare, Search, Send, UserPlus } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendDirectMessage, markConversationRead } from "@/lib/direct-messages.functions";
import { toast } from "sonner";
import { SignedImg } from "@/components/ui/signed-img";

const searchSchema = z.object({
  to: z.string().uuid().optional(),
});

export const Route = createFileRoute("/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — BWF Network" },
      { name: "description", content: "Direct messages with artists, hosts, and your network." },
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
          .from("profiles")
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages.length, activeId]);

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
        .from("profiles")
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

  if (auth.loading || !auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] text-white/60 text-sm">
        Loading…
      </div>
    );
  }

  const activeProfile = activeId ? (profiles[activeId] ?? null) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0a12] text-bone">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Messages
          </h1>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4" /> New message
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[70vh] min-h-[500px]">
          {/* Sidebar */}
          <aside className={`rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col ${activeId ? "hidden md:flex" : "flex"}`}>
            {showNew && (
              <div className="border-b border-white/10 p-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 py-2 text-sm outline-none focus:border-violet-500/60"
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
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
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
                    className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-white/5 ${activeId === c.other.id ? "bg-white/10" : ""}`}
                  >
                    <Avatar profile={c.other} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.other.display_name || "Unknown user"}</span>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>
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
          <section className={`rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
            {activeId ? (
              <>
                <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <button
                    onClick={() => { setActiveId(null); nav({ to: "/messages", search: {}, replace: true }); }}
                    className="md:hidden rounded-md p-1 hover:bg-white/10"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar profile={activeProfile ?? { id: activeId, display_name: null, avatar_url: null }} />
                  <h2 className="font-medium">{activeProfile?.display_name || "Unknown user"}</h2>
                </header>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {activeMessages.length === 0 ? (
                    <p className="text-center text-xs text-white/40 mt-12">No messages yet. Say hi 👋</p>
                  ) : (
                    activeMessages.map((m) => {
                      const mine = m.sender_id === auth.user!.id;
                      const senderProfile = mine
                        ? { id: auth.user!.id, display_name: auth.user!.user_metadata?.display_name ?? null, avatar_url: auth.user!.user_metadata?.avatar_url ?? null }
                        : (activeProfile ?? { id: m.sender_id, display_name: null, avatar_url: null });
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                          {!mine && <Avatar profile={senderProfile} />}
                          <div
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-violet-600 text-white" : "bg-white/10 text-bone"}`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-white/40"}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                          {mine && <Avatar profile={senderProfile} />}
                        </div>
                      );
                    })
                  )}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="border-t border-white/10 p-3 flex items-end gap-2"
                >
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Type a message…"
                    rows={1}
                    maxLength={4000}
                    className="flex-1 resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/60 max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!body.trim() || sending}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
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
  if (profile.avatar_url) {
    return <SignedImg src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  const initial = (profile.display_name || "?").charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
      {initial}
    </div>
  );
}