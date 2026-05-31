import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Radio, Crown, Mic, Headphones, ArrowRight, AlertTriangle } from "lucide-react";
import { resolveInvite, recordInviteJoin, type ResolvedInvite } from "@/lib/invites.functions";
import { getGuestLiveKitToken, getLiveKitToken } from "@/lib/livekit.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { LiveStage } from "@/components/stream/LiveStage";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { StageRoom, AudienceRow } from "@/components/stream/StageRoom";
import { RaiseHandButton } from "@/components/stream/RaiseHandButton";
import { useStageState, type StageParticipant } from "@/lib/useStageState";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/invite/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Join BWF Network Live — ${params.code}` },
      { name: "description", content: "Join a live BWF Network room as host, speaker, or listener." },
      { property: "og:title", content: "Join BWF Network Live" },
      { property: "og:description", content: "You've been invited to a BWF Network live room." },
    ],
  }),
  component: InvitePage,
});

type Role = "host" | "speaker" | "listener";

function InvitePage() {
  const { code } = useParams({ from: "/invite/$code" });
  const resolveFn = useServerFn(resolveInvite);
  const recordFn = useServerFn(recordInviteJoin);
  const guestTokenFn = useServerFn(getGuestLiveKitToken);
  const authTokenFn = useServerFn(getLiveKitToken);
  const auth = useAuth();
  const navigate = useNavigate();

  const [resolved, setResolved] = useState<ResolvedInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [lk, setLk] = useState<{ token: string; wsUrl: string } | null>(null);
  const [joinedAs, setJoinedAs] = useState<Role | null>(null);

  useEffect(() => {
    console.log("[invite] page opened", { code });
    setLoading(true);
    resolveFn({ data: { code } })
      .then((r) => setResolved(r))
      .catch((e) => {
        console.error("[invite] resolve failed", e);
        setResolved({ ok: false, reason: "not_found" } as ResolvedInvite);
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (auth.displayName && !displayName) setDisplayName(auth.displayName);
  }, [auth.displayName]);

  const join = async (role: Role) => {
    if (!resolved || !resolved.ok) return;
    const needsAuth = role === "host" || role === "speaker";
    if (needsAuth && !auth.isAuthenticated) {
      const redirect = `/invite/${code}`;
      toast.message("Sign in to join as " + role);
      navigate({ to: "/login", search: { redirect } as any });
      return;
    }
    if (!needsAuth && !displayName.trim()) {
      toast.error("Enter a display name");
      return;
    }
    setJoining(true);
    try {
      const roomName = resolved.stream.room_name;
      let token: string;
      let wsUrl: string;
      if (needsAuth) {
        const t = await authTokenFn({ data: { roomName } });
        token = t.token;
        wsUrl = t.wsUrl;
      } else {
        const t = await guestTokenFn({ data: { roomName, displayName: displayName.trim() } });
        token = t.token;
        wsUrl = t.wsUrl;
      }
      setLk({ token, wsUrl });
      setJoinedAs(role);
      recordFn({ data: { code, role, userId: auth.user?.id } }).catch(() => {});
      console.log("[invite] joined room", { code, role, room: roomName });

      // If host or speaker, register as a stage participant with that role.
      if (auth.user && resolved.stream.mode === "stage") {
        const stageRole = role === "host" ? "host" : role === "speaker" ? "speaker" : "listener";
        await supabase
          .from("stage_participants")
          .upsert(
            { stream_id: resolved.stream.id, user_id: auth.user.id, stage_role: stageRole },
            { onConflict: "stream_id,user_id" },
          );
      }
    } catch (e: any) {
      console.error("[invite] join failed", e);
      toast.error(e?.message || "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <Shell><div className="text-white/60 text-sm">Validating invite…</div></Shell>;
  }

  if (!resolved || !resolved.ok) {
    return <NotFound reason={(resolved as any)?.reason ?? "not_found"} code={code} />;
  }

  // Live room view once joined
  if (lk) {
    const stream = resolved.stream;
    return (
      <div className="min-h-screen bg-[#050509] text-white p-4">
        <div className="mx-auto max-w-5xl flex flex-col gap-4">
          <InviteRoom
            stream={stream}
            lk={lk}
            auth={auth}
            role={joinedAs ?? "listener"}
            onLeave={() => setLk(null)}
          />
        </div>
      </div>
    );
  }

  // Join Room screen
  const allowed = resolved.allowed_role;
  const canHost = allowed === "host";
  const canSpeak = allowed === "host" || allowed === "speaker";

  return (
    <Shell>
      <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
        BWF Network · Live Invite
      </div>
      <h1 className="text-2xl font-bold mb-1">{resolved.stream.title}</h1>
      <div className="mb-5 flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
          resolved.stream.status === "live"
            ? "bg-red-500/15 text-red-300"
            : "bg-white/5 text-white/50"
        }`}>
          <Radio className="h-3 w-3" />
          {resolved.stream.status === "live" ? "LIVE NOW" : resolved.stream.status.toUpperCase()}
        </span>
        <span className="text-white/40">room: {resolved.stream.room_name}</span>
      </div>

      {!auth.isAuthenticated && (
        <input
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
      )}

      <div className="flex flex-col gap-2">
        {canHost && (
          <JoinButton
            icon={<Crown className="h-4 w-4" />}
            label="Join as Host"
            sub={auth.isAuthenticated ? "Stage controls + microphone" : "Sign-in required"}
            disabled={joining}
            onClick={() => join("host")}
            highlight
          />
        )}
        {canSpeak && (
          <JoinButton
            icon={<Mic className="h-4 w-4" />}
            label="Join as Speaker"
            sub={auth.isAuthenticated ? "On stage, can speak" : "Sign-in required"}
            disabled={joining}
            onClick={() => join("speaker")}
          />
        )}
        <JoinButton
          icon={<Headphones className="h-4 w-4" />}
          label="Join as Listener"
          sub="Listen in from the audience"
          disabled={joining || (!auth.isAuthenticated && !displayName.trim())}
          onClick={() => join("listener")}
        />
      </div>

      {!auth.isAuthenticated && (canHost || canSpeak) && (
        <p className="mt-4 text-[11px] text-white/40">
          Hosts and speakers need an account.{" "}
          <Link to="/login" search={{ redirect: `/invite/${code}` } as any} className="text-violet-300 hover:underline">
            Sign in
          </Link>{" "}
          to unlock those roles.
        </p>
      )}
    </Shell>
  );
}

function JoinButton({
  icon, label, sub, onClick, disabled, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${
        highlight
          ? "border-violet-400/40 bg-gradient-to-r from-violet-500/20 to-blue-500/20 hover:from-violet-500/30 hover:to-blue-500/30"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white/10 p-2 text-white">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          <div className="text-[11px] text-white/50">{sub}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-white/60" />
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        {children}
      </div>
    </div>
  );
}

function NotFound({ reason, code }: { reason: string; code: string }) {
  const message =
    reason === "expired" ? "This invite has expired."
    : reason === "exhausted" ? "This invite has reached its maximum number of uses."
    : reason === "no_live_stream" ? "There's no live stream right now. Check back when a host goes live."
    : "Invite Not Found";
  return (
    <Shell>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold mb-1">Invite Not Found</h1>
        <p className="text-sm text-white/60 mb-4">{message}</p>
        <p className="text-[11px] text-white/40 mb-4">Code: <code className="text-white/60">{code}</code></p>
        <Link to="/" className="inline-block rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5">
          Back to BWF
        </Link>
      </div>
    </Shell>
  );
}

function InviteRoom({
  stream, lk, auth, role, onLeave,
}: {
  stream: { id: string; room_name: string; title: string; status: string; mode: string; host_id: string };
  lk: { token: string; wsUrl: string };
  auth: ReturnType<typeof useAuth>;
  role: Role;
  onLeave: () => void;
}) {
  const { participants } = useStageState(stream.id);
  if (stream.mode === "stage" && auth.user) {
    return (
      <StageAudioShell
        token={lk.token}
        serverUrl={lk.wsUrl}
        streamId={stream.id}
        userId={auth.user.id}
        isHost={role === "host"}
        onLeave={onLeave}
      >
        <StageRoom
          streamId={stream.id}
          participants={participants as StageParticipant[]}
          canManage={role === "host"}
          selfProfile={{
            user_id: auth.user.id,
            display_name: auth.displayName,
            avatar_url: auth.avatarUrl,
          }}
        />
        <div className="flex justify-center">
          <RaiseHandButton streamId={stream.id} auth={auth} />
        </div>
        <AudienceRow participants={participants as StageParticipant[]} />
      </StageAudioShell>
    );
  }
  return (
    <>
      <LiveStage token={lk.token} serverUrl={lk.wsUrl} onEnd={onLeave} onInvite={() => {}} />
      {auth.user && (
        <div className="flex justify-center">
          <RaiseHandButton streamId={stream.id} auth={auth} />
        </div>
      )}
      <AudienceRow participants={participants as StageParticipant[]} />
    </>
  );
}