export const PROFILE_PLATFORMS = [
  { key: "twitch", label: "Twitch", placeholder: "https://www.twitch.tv/yourchannel", hosts: ["twitch.tv"] },
  { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@yourchannel", hosts: ["youtube.com", "youtu.be"] },
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourpage", hosts: ["facebook.com", "fb.com"] },
  { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@yourname", hosts: ["tiktok.com"] },
  { key: "kick", label: "Kick", placeholder: "https://kick.com/yourchannel", hosts: ["kick.com"] },
] as const;

export type ProfilePlatformLink = { provider: string; url: string; handle: string | null };

// Friendly name for any provider, including older ones that aren't in the picker list.
export function platformLabel(provider: string): string {
  const match = PROFILE_PLATFORMS.find(p => p.key === provider.trim().toLowerCase());
  if (match) return match.label;
  return provider
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function safePlatformUrl(provider: string, value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const platform = PROFILE_PLATFORMS.find(p => p.key === provider.toLowerCase());
    if (platform && !platform.hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.href;
  } catch { return null; }
}