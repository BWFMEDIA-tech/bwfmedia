// Plugin-style registry of external streaming destinations.
// Add a new platform by appending to STREAM_PLATFORMS — no changes needed
// anywhere else in Stream Studio.

export type StreamPlatformKey = "twitch" | "youtube" | "facebook" | "kick";

export type StreamPlatform = {
  key: StreamPlatformKey;
  label: string;
  // Brand accent (tailwind class) used for the platform's badge.
  badgeClass: string;
  // "oauth"  — starts an OAuth flow at /api/oauth/{key}/start
  // "manual" — user pastes an RTMP URL + stream key (used by Kick today,
  //            since Kick has no public OAuth broadcasting API yet).
  authKind: "oauth" | "manual";
  // Whether Tunevio can automatically restream to this platform today.
  // All providers are currently `false` — connections are stored, but the
  // actual RTMP fan-out infrastructure is a follow-up task.
  supportsBroadcast: boolean;
  helpText: string;
};

export const STREAM_PLATFORMS: StreamPlatform[] = [
  {
    key: "twitch",
    label: "Twitch",
    badgeClass: "bg-[#9146FF]",
    authKind: "oauth",
    supportsBroadcast: false,
    helpText: "Link your Twitch channel to simulcast alongside Tunevio.",
  },
  {
    key: "youtube",
    label: "YouTube",
    badgeClass: "bg-[#FF0000]",
    authKind: "oauth",
    supportsBroadcast: false,
    helpText: "Link YouTube to broadcast to your channel's live stream.",
  },
  {
    key: "facebook",
    label: "Facebook",
    badgeClass: "bg-[#1877F2]",
    authKind: "oauth",
    supportsBroadcast: false,
    helpText: "Link Facebook to go live on your page.",
  },
  {
    key: "kick",
    label: "Kick",
    badgeClass: "bg-[#53FC18] text-black",
    authKind: "manual",
    supportsBroadcast: false,
    helpText:
      "Kick has no public OAuth API for broadcasting. Paste your RTMP URL and stream key from Kick → Settings → Stream Key.",
  },
];

export function getPlatform(key: string): StreamPlatform | undefined {
  return STREAM_PLATFORMS.find((p) => p.key === key);
}