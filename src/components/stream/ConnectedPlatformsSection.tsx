import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Plug, Radio } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyStreamPlatformConnections,
  disconnectStreamPlatform,
  getStreamPlatformAuthorizeUrl,
  saveKickRtmp,
} from "@/lib/stream-platforms.functions";
import { STREAM_PLATFORMS, type StreamPlatformKey } from "@/lib/stream-platforms/registry";

type Connection = { id: string; platform: string; account_label: string | null };

function CallbackUrlList() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const rows = [
    { key: "twitch", label: "Twitch", path: "/api/oauth/twitch/callback" },
    { key: "youtube", label: "YouTube (Google)", path: "/api/oauth/youtube/callback" },
    { key: "facebook", label: "Facebook (Meta)", path: "/api/oauth/facebook/callback" },
    { key: "kick", label: "Kick", path: null },
  ];
  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied");
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <div className="mt-4 rounded-md border border-white/10 bg-black/30 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
        OAuth Redirect URIs
      </div>
      <p className="mb-2 text-[10px] text-white/40">
        Paste these exactly into each provider's OAuth app settings when registering credentials.
      </p>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const url = r.path && origin ? `${origin}${r.path}` : null;
          return (
            <div
              key={r.key}
              className="flex items-center gap-2 rounded border border-white/5 bg-black/40 px-2 py-1.5"
            >
              <span className="w-28 shrink-0 text-[11px] font-semibold text-white/70">
                {r.label}
              </span>
              {url ? (
                <>
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#00E6FF]">
                    {url}
                  </code>
                  <button
                    onClick={() => copy(r.key, url)}
                    className="shrink-0 rounded border border-white/10 p-1 text-white/60 hover:bg-white/5 hover:text-white"
                    title="Copy"
                  >
                    {copied === r.key ? (
                      <Check className="h-3 w-3 text-[#00E6FF]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-white/40">
                  Manual RTMP — no OAuth callback needed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConnectedPlatformsSection() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [kickOpen, setKickOpen] = useState(false);

  const list = useServerFn(listMyStreamPlatformConnections);
  const disconnect = useServerFn(disconnectStreamPlatform);
  const getUrl = useServerFn(getStreamPlatformAuthorizeUrl);

  async function refresh() {
    try {
      const rows = await list();
      setConns((rows ?? []) as Connection[]);
    } catch (e: any) {
      // silent — auth errors handled by parent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // Handle OAuth callback redirect
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    const platform = url.searchParams.get("platform");
    const message = url.searchParams.get("message");
    if (status && platform) {
      if (status === "connected") toast.success(`Connected ${platform}`);
      else toast.error(message || `Failed to connect ${platform}`);
      url.searchParams.delete("status");
      url.searchParams.delete("platform");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(key: StreamPlatformKey) {
    if (key === "kick") {
      setKickOpen(true);
      return;
    }
    setBusy(key);
    try {
      const res = await getUrl({ data: { platform: key as any, origin: window.location.origin } });
      if (!res.ok) {
        toast.error(
          `${key}: OAuth app not configured yet. Add ${res.envVars.join(" + ")} in Cloud secrets.`,
          { duration: 6000 },
        );
        return;
      }
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message || "Could not start OAuth");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect(platform: string) {
    setBusy(platform);
    try {
      await disconnect({ data: { platform } });
      toast.success(`Disconnected ${platform}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to disconnect");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Plug className="h-4 w-4 text-[#00E6FF]" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Connected Platforms</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {STREAM_PLATFORMS.map((p) => {
            const conn = conns.find((c) => c.platform === p.key);
            return (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-black text-white ${p.badgeClass}`}
                  >
                    {p.label[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="truncate text-xs text-white/50">
                      {conn ? `Connected · ${conn.account_label ?? "linked"}` : "Not connected"}
                    </div>
                  </div>
                </div>
                {conn ? (
                  <button
                    onClick={() => handleDisconnect(p.key)}
                    disabled={busy === p.key}
                    className="rounded-md border border-white/10 px-3 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                  >
                    {busy === p.key ? "…" : "Disconnect"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(p.key)}
                    disabled={busy === p.key}
                    className="rounded-md bg-[#00E6FF] px-3 py-1 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
                  >
                    {busy === p.key ? "…" : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/40">
        <Radio className="h-3 w-3" /> Linking stores your account. Automatic restream fan-out is
        coming — for now, use the link as your simulcast handoff.
      </p>
      <CallbackUrlList />
      {kickOpen && <KickRtmpModal onClose={() => setKickOpen(false)} onSaved={refresh} />}
    </div>
  );
}

function KickRtmpModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("rtmps://fa723fc1b171.global-contribute.live-video.net/app/");
  const [rtmpKey, setRtmpKey] = useState("");
  const [saving, setSaving] = useState(false);
  const save = useServerFn(saveKickRtmp);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { accountLabel: label.trim(), rtmpUrl: rtmpUrl.trim(), rtmpKey: rtmpKey.trim() } });
      toast.success("Kick connected");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0a0a12] p-5">
        <h3 className="text-lg font-black">Connect Kick</h3>
        <p className="mt-1 text-xs text-white/60">
          Kick has no public OAuth API for broadcasting. Paste your RTMP URL + stream key from
          Kick → Settings → Stream Key. Stored encrypted, never shown in the browser.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs">
            <span className="text-white/60">Account name</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="your-kick-username"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#00E6FF]"
            />
          </label>
          <label className="block text-xs">
            <span className="text-white/60">RTMP URL</span>
            <input
              value={rtmpUrl}
              onChange={(e) => setRtmpUrl(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs outline-none focus:border-[#00E6FF]"
            />
          </label>
          <label className="block text-xs">
            <span className="text-white/60">Stream key</span>
            <input
              type="password"
              value={rtmpKey}
              onChange={(e) => setRtmpKey(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs outline-none focus:border-[#00E6FF]"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !label || !rtmpUrl || !rtmpKey}
            className="rounded-md bg-[#00E6FF] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}