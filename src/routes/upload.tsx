import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clapperboard, Mic, Music2, Package, Radio, Swords } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — BWF Network" },
      { name: "description", content: "Submit a track to Play Arena, add music to your profile, or go live on BWF Network." },
      { property: "og:title", content: "Upload — BWF Network" },
      { property: "og:description", content: "Submit tracks, add music, or go live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    to: "/videos",
    search: { upload: true },
    icon: Clapperboard,
    title: "Upload Music Video",
    desc: "Share a music video with fans on your channel.",
  },
  {
    to: "/distribution",
    icon: Package,
    title: "Distribution",
    desc: "Release music to the Tunevio network with artwork, masters and rights.",
  },
  {
    to: "/go-live",
    icon: Radio,
    title: "Go Live",
    desc: "Start a live video stream on your profile — fans watch and chat.",
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
      <h1 className="text-3xl font-black text-foreground">Upload</h1>
      <p className="mt-1 text-sm text-muted-foreground">What do you want to share today?</p>
      <div className="mt-6 grid gap-5">
        {OPTIONS.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            search={"search" in o ? (o.search as any) : undefined}
            className="upload-action group flex min-h-28 items-center gap-4 rounded-lg border p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <div
              className="upload-action-icon grid h-14 w-12 shrink-0 place-items-center rounded-lg border"
            >
              <o.icon className="h-6 w-6 text-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground sm:text-base">{o.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-brand-silver">{o.desc}</div>
            </div>
            <span className="upload-action-arrow grid h-7 w-7 shrink-0 place-items-center rounded-full" aria-hidden="true">
              <ChevronRight className="h-5 w-5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}