import { Link } from "@tanstack/react-router";
import { ExternalLink, Twitch, Youtube, Facebook, Music2, Radio, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFILE_PLATFORMS, platformLabel, safePlatformUrl, type ProfilePlatformLink } from "@/lib/profile-platforms";

const icons = { twitch: Twitch, youtube: Youtube, facebook: Facebook, tiktok: Music2, kick: Radio };

export function ProfilePlatformLinks({ links, isOwner = false }: { links: ProfilePlatformLink[]; isOwner?: boolean }) {
  const visible = links.flatMap(link => {
    const url = safePlatformUrl(link.provider, link.url);
    return url ? [{ ...link, url }] : [];
  });
  if (!visible.length && !isOwner) return null;
  return (
    <section aria-label="Connected platforms" className="w-full min-w-0 space-y-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Connected platforms</h2>
        {isOwner && <Button asChild size="sm" variant="ghost"><Link to="/settings/connected-apps"><Plus />{visible.length ? "Edit platforms" : "Add platforms"}</Link></Button>}
      </div>
      {!!visible.length && <div className="flex flex-wrap gap-2">
        {visible.map(link => {
          const key = link.provider.toLowerCase();
          const platform = PROFILE_PLATFORMS.find(p => p.key === key);
          const Icon = icons[key as keyof typeof icons] ?? Link2;
          return <Button key={link.provider + link.url} asChild variant="outline" size="sm"><a href={link.url} target="_blank" rel="noopener noreferrer" title={link.handle || platformLabel(link.provider)}><Icon /><span>{platformLabel(link.provider)}</span><ExternalLink className="size-3" /></a></Button>;
        })}
      </div>}
    </section>
  );
}