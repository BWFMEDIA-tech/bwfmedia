import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StudioStub({
  icon: Icon,
  title,
  blurb,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
}) {
  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            boxShadow: "0 8px 32px rgba(139,92,246,0.45)",
          }}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mb-8 max-w-md text-sm text-white/60">{blurb}</p>
        <span className="mb-8 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-widest text-white/70">
          COMING SOON
        </span>
        <Link
          to="/stream-studio"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Studio
        </Link>
      </div>
    </div>
  );
}