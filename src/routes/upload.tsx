import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Music2, Radio, Swords } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — BWF Network" },
      { name: "description", content: "Submit a track to Play Arena, add music to your profile, or go live on BWF Network." },
      { property: "og:title", content: "Upload — BWF Network" },
      { property: "og:description", content: "Submit tracks, add music, or go live." },
    ],
  }),
  component: UploadHub,
});

const OPTIONS = [
  {
    to: "/play",
    icon: Swords,
    title: "Submit to Play Arena",
    desc: "Enter live 1v1 music battles and let fans vote.",
  },
  {
    to: "/settings/music-media",
    icon: Music2,
    title: "Add Music to Profile",
    desc: "Upload tracks and manage your catalog.",
  },
  {
    to: "/artist-dashboard",
    icon: Radio,
    title: "Go Live",
    desc: "Start a live stream or audio room.",
  },
  {
    to: "/settings/artist-info",
    icon: Mic,
    title: "Artist Setup",
    desc: "Complete your artist profile to unlock more.",
  },
] as const;

function UploadHub() {
  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 md:max-w-2xl md:pt-10">
      <h1 className="text-3xl font-black tracking-tight text-foreground">Upload</h1>
      <p className="mt-1 text-sm text-muted-foreground">What do you want to share today?</p>
      <div className="mt-6 grid gap-3">
        {OPTIONS.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-[#C53DFF]/50 hover:bg-white/[0.06]"
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(197,61,255,0.25), rgba(0,230,255,0.2))",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <o.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground">{o.title}</div>
              <div className="truncate text-xs text-muted-foreground">{o.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}