import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";

type Reason =
  | "token_invalid"
  | "websocket_closed"
  | "stage_full"
  | "server_shutdown"
  | "transport"
  | "unknown";

const REASON_COPY: Record<Reason, { title: string; detail: string }> = {
  token_invalid: {
    title: "Session token expired",
    detail: "Your stage credentials are no longer valid. Retrying with a fresh token…",
  },
  websocket_closed: {
    title: "Connection dropped",
    detail: "The audio websocket closed unexpectedly (code 1006). Retrying…",
  },
  stage_full: {
    title: "Stage is full",
    detail: "The room has reached its participant limit. Waiting for a slot to free up…",
  },
  server_shutdown: {
    title: "Server restarted",
    detail: "The streaming server restarted. Reconnecting you to the room…",
  },
  transport: {
    title: "Network unstable",
    detail: "Lost the audio link. Trying to reconnect…",
  },
  unknown: {
    title: "Reconnecting…",
    detail: "Lost the audio link. Trying to reconnect…",
  },
};

function reasonFromDisconnect(reason?: DisconnectReason, msg?: string): Reason {
  const text = (msg ?? "").toLowerCase();
  if (text.includes("max participants") || text.includes("room is full") || text.includes("stage is full")) {
    return "stage_full";
  }
  if (text.includes("token") || text.includes("unauthorized") || text.includes("expired")) {
    return "token_invalid";
  }
  if (text.includes("1006") || text.includes("websocket")) {
    return "websocket_closed";
  }
  switch (reason) {
    case DisconnectReason.SERVER_SHUTDOWN:
      return "server_shutdown";
    case DisconnectReason.SIGNAL_CLOSE:
      return "websocket_closed";
    case DisconnectReason.STATE_MISMATCH:
    case DisconnectReason.JOIN_FAILURE:
      return "token_invalid";
    default:
      return "transport";
  }
}

/**
 * Sits inside the LiveKit room context. When the local participant drops or
 * enters a reconnect cycle, it shows an inline banner with the inferred
 * reason (token / websocket / stage full / …) and a retry countdown that
 * mirrors the auto-rejoin backoff in `ReconnectAudioGuard`.
 */
export function StageReconnectBanner() {
  const room = useRoomContext();
  const [state, setState] = useState<ConnectionState>(room?.state ?? ConnectionState.Connected);
  const [reason, setReason] = useState<Reason>("unknown");
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!room) return;
    const onState = (s: ConnectionState) => {
      setState(s);
      if (s === ConnectionState.Connected) {
        attemptRef.current = 0;
        setNextRetryAt(null);
        setReason("unknown");
      } else if (s === ConnectionState.Reconnecting && reason === "unknown") {
        setReason("transport");
      }
    };
    const onReconnected = () => {
      attemptRef.current = 0;
      setNextRetryAt(null);
      setReason("unknown");
    };
    const onDisconnected = (r?: DisconnectReason) => {
      // Skip user-initiated leave / kick / room ended — banner would be noise.
      if (
        r === DisconnectReason.CLIENT_INITIATED ||
        r === DisconnectReason.PARTICIPANT_REMOVED ||
        r === DisconnectReason.ROOM_DELETED ||
        r === DisconnectReason.DUPLICATE_IDENTITY ||
        r === DisconnectReason.USER_REJECTED
      ) {
        setNextRetryAt(null);
        return;
      }
      attemptRef.current += 1;
      const delay = Math.min(15000, 1000 * 2 ** Math.min(attemptRef.current - 1, 3));
      setReason(reasonFromDisconnect(r));
      setNextRetryAt(Date.now() + delay);
    };
    room.on(RoomEvent.ConnectionStateChanged, onState);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.SignalConnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onState);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.SignalConnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // 1Hz ticker only while we're showing a countdown.
  useEffect(() => {
    if (!nextRetryAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [nextRetryAt]);

  const isReconnecting = state === ConnectionState.Reconnecting;
  const isDisconnected = state === ConnectionState.Disconnected && nextRetryAt !== null;
  if (!isReconnecting && !isDisconnected) return null;

  const copy = REASON_COPY[reason];
  const secondsLeft = nextRetryAt ? Math.max(0, Math.ceil((nextRetryAt - now) / 1000)) : null;
  const isFatal = reason === "stage_full";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
        isFatal
          ? "border-red-500/40 bg-red-500/10 text-red-100"
          : "border-amber-400/40 bg-amber-500/10 text-amber-100"
      }`}
    >
      {isFatal ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
      ) : isReconnecting ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-300" />
      ) : (
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{copy.title}</span>
          <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
            {reason.replace("_", " ")}
          </span>
          {secondsLeft !== null && !isFatal && (
            <span className="text-[11px] text-amber-200/80">
              {secondsLeft > 0 ? `Retrying in ${secondsLeft}s…` : "Retrying now…"}
            </span>
          )}
        </div>
        <p className="mt-1 leading-relaxed text-white/70">{copy.detail}</p>
      </div>
      {!isFatal && (
        <button
          type="button"
          onClick={() => {
            attemptRef.current = 0;
            setNextRetryAt(Date.now());
          }}
          className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20"
        >
          Retry now
        </button>
      )}
    </div>
  );
}