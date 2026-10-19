import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowRight, Loader2, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSISTANT_ROUTES, SUGGESTED_QUESTIONS, UNANSWERED_MARKER, allowedAssistantPath, audienceFromRoles } from "@/lib/assistant";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import robot from "@/assets/tunevio-assistant.png";

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Turns markdown links into bold text and collects only allowed pages as buttons. */
function splitAnswer(raw: string) {
  const links: { to: string; label: string }[] = [];
  const text = raw.replaceAll(UNANSWERED_MARKER, "").replace(LINK_RE, (_m, label: string, href: string) => {
    const to = allowedAssistantPath(href);
    if (to && !links.some((l) => l.to === to)) links.push({ to, label: label || ASSISTANT_ROUTES[to] });
    return `**${label}**`;
  });
  return { text, links };
}

const textOf = (m: UIMessage) => m.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("");

export function AssistantRobot({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={robot} alt="Tunevio AI Assistant" width={816} height={816} className={`${className} shrink-0 object-contain`} />;
}

export function AssistantChat({ compact = false, onNavigate, onClose }: { compact?: boolean; onNavigate?: () => void; onClose?: () => void }) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const audience = audienceFromRoles(auth.user ? auth.roles : null);
  const [input, setInput] = useState("");
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const taRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/assistant/chat",
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      return t ? { Authorization: `Bearer ${t}` } : ({} as Record<string, string>);
    },
  }), []);

  const { messages, setMessages, sendMessage, status, stop, error, clearError } = useChat({
    id: userId ?? "guest",
    transport,
    onError: (e) => {
      let msg = e.message;
      try { msg = JSON.parse(e.message).error ?? msg; } catch { /* plain text */ }
      toast.error(msg || "The assistant couldn't answer. Please try again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  // Restore this account's saved conversation.
  useEffect(() => {
    if (!userId) { setMessages([]); return; }
    let off = false;
    supabase.from("assistant_messages").select("message_id, role, parts, created_at").eq("user_id", userId).order("created_at").then(({ data, error }) => {
      if (off) return;
      if (error) { toast.error("Couldn't load your earlier chat."); return; }
      setMessages((data ?? []).map((r: any) => ({ id: r.message_id, role: r.role, parts: r.parts })) as UIMessage[]);
    });
    return () => { off = true; };
  }, [userId, setMessages]);

  useEffect(() => { if (!busy) taRef.current?.focus(); }, [busy]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    clearError();
    sendMessage({ text: t });
    setInput("");
  };

  const clear = async () => {
    stop();
    if (userId) {
      const { error } = await supabase.from("assistant_messages").delete().eq("user_id", userId);
      if (error) { toast.error("Couldn't clear your chat."); return; }
    }
    setMessages([]);
    toast.success("Chat cleared");
  };

  const rate = async (id: string, idx: number, helpful: boolean) => {
    const q = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    setRated((r) => ({ ...r, [id]: helpful }));
    const { error } = await supabase.from("assistant_feedback").insert({ user_id: userId, question: q ? textOf(q).slice(0, 500) : "", helpful });
    if (error) toast.error("Couldn't save feedback.");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <AssistantRobot />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Tunevio AI Assistant</p>
          <p className="truncate text-xs text-muted-foreground">
            {audience === "guest" ? "Ask anything about Tunevio" : `Helping you as ${audience === "fan" ? "a fan" : `an ${audience}`.replace("an host", "a host").replace("an moderator", "a moderator")}`}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" /> Clear chat
          </button>
        )}
        {onClose && (
          <button type="button" aria-label="Close assistant" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className={compact ? "gap-5 p-4" : "gap-6 p-4 md:p-6"}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AssistantRobot className="h-20 w-20" />
              <div>
                <p className="font-bold">Hi! I'm the Tunevio AI Assistant.</p>
                <p className="mt-1 text-sm text-muted-foreground">I'll walk you through Tunevio step by step. I can explain and show you where things are, but I can't change your account.</p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTED_QUESTIONS[audience].map((q) => (
                  <button key={q} type="button" onClick={() => ask(q)} className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary">{q}</button>
                ))}
              </div>
              {audience === "guest" && (
                <p className="text-xs text-muted-foreground">New here? <Link to="/pricing" className="text-primary" onClick={onNavigate}>Create an account</Link> to save your chat.</p>
              )}
            </div>
          )}
          {messages.map((m, idx) => {
            if (m.role === "user") return (
              <Message from="user" key={m.id}>
                <MessageContent className="bg-primary text-primary-foreground">{textOf(m)}</MessageContent>
              </Message>
            );
            const { text, links } = splitAnswer(textOf(m));
            const done = !(busy && idx === messages.length - 1);
            return (
              <Message from="assistant" key={m.id}>
                <div className="flex items-start gap-2.5">
                  <AssistantRobot className="mt-0.5 h-8 w-8 shrink-0" />
                  <MessageContent className="min-w-0 flex-1 bg-transparent p-0">
                  {text ? <MessageResponse className="[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">{text}</MessageResponse> : <span className="text-sm text-muted-foreground">Thinking…</span>}
                  {done && links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {links.map((l, i) => (
                        <Link key={l.to} to={l.to as any} onClick={onNavigate} className="inline-flex items-center gap-1 rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                          {i === 0 ? "Show me where: " : ""}{l.label} <ArrowRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {done && text && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {m.id in rated ? <span>Thanks for the feedback.</span> : (<>
                        <span>Helpful?</span>
                        <button type="button" aria-label="Helpful" onClick={() => rate(m.id, idx, true)} className="hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Not helpful" onClick={() => rate(m.id, idx, false)} className="hover:text-foreground"><ThumbsDown className="h-3.5 w-3.5" /></button>
                      </>)}
                    </div>
                  )}
                </MessageContent>
              </Message>
            );
          })}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> The assistant is thinking…</div>
          )}
          {error && !busy && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
              The assistant couldn't answer. Try again, or <Link to="/contact" className="text-primary" onClick={onNavigate}>contact support</Link>.
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput onSubmit={(msg) => ask(msg.text ?? "")}>
          <PromptInputTextarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask how to do something on Tunevio…" maxLength={2000} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
