import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  User, Music2, Video, BarChart3, Bell, ChevronRight, Menu,
} from "lucide-react";

type Leaf = { to: string; label: string; search?: Record<string, string> };
type Entry =
  | { kind: "link"; to: string; label: string; icon: any }
  | { kind: "group"; key: string; label: string; icon: any; children: Leaf[] };

const NAV: Entry[] = [
  {
    kind: "group", key: "profile", label: "Profile", icon: User,
    children: [
      { to: "/settings/profile", label: "Artist Photo", search: { section: "photo" } },
      { to: "/settings/profile", label: "Banner Image", search: { section: "banner" } },
      { to: "/settings/profile", label: "Biography", search: { section: "bio" } },
      { to: "/settings/social-links", label: "Social Links" },
    ],
  },
  {
    kind: "group", key: "music", label: "Music", icon: Music2,
    children: [
      { to: "/settings/music-media", label: "Singles", search: { type: "single" } },
      { to: "/settings/music-media", label: "Albums", search: { type: "album" } },
      { to: "/settings/music-media", label: "EPs", search: { type: "ep" } },
      { to: "/settings/music-media", label: "Upload Requests", search: { tab: "upload" } },
    ],
  },
  {
    kind: "group", key: "videos", label: "Videos", icon: Video,
    children: [
      { to: "/settings/music-media", label: "Music Videos", search: { type: "video" } },
      { to: "/settings/music-media", label: "Shorts", search: { type: "short" } },
      { to: "/dashboard", label: "Video Analytics", search: { tab: "video" } },
    ],
  },
  {
    kind: "group", key: "analytics", label: "Analytics", icon: BarChart3,
    children: [
      { to: "/dashboard", label: "Streams", search: { tab: "streams" } },
      { to: "/dashboard", label: "Followers", search: { tab: "followers" } },
      { to: "/dashboard", label: "Audience Insights", search: { tab: "audience" } },
      { to: "/earnings", label: "Revenue Reports" },
    ],
  },
  { kind: "link", to: "/settings/notifications", label: "Notifications", icon: Bell },
];

export function ArtistDashboardShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({
    profile: true, music: true, videos: false, analytics: false,
  });

  return (
    <div className="min-h-screen bg-[#050509] text-white flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-[#0a0a14] transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="text-xl font-black tracking-tight">
            <span className="text-white">BWF</span>
            <span className="ml-1 text-[10px] font-bold tracking-[0.3em] text-fuchsia-400">ARTIST</span>
          </div>
        </div>
        <div className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-400">
          Artist Dashboard
        </div>
        <nav className="px-2 pb-4">
          {NAV.map((entry) => {
            if (entry.kind === "link") {
              const Icon = entry.icon;
              const active = pathname === entry.to || pathname.startsWith(entry.to + "/");
              return (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-fuchsia-600/90 to-pink-500/70 text-white shadow-[0_4px_20px_-4px_rgba(217,70,239,0.5)]"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {entry.label}
                </Link>
              );
            }
            const Icon = entry.icon;
            const isOpen = open[entry.key];
            const groupActive = entry.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
            return (
              <div key={entry.key} className="mb-1">
                <button
                  type="button"
                  onClick={() => setOpen((p) => ({ ...p, [entry.key]: !p[entry.key] }))}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                    groupActive ? "bg-white/5 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 ml-3 border-l border-white/10 pl-3">
                    {entry.children.map((c) => (
                      <Link
                        key={entry.key + c.label}
                        to={c.to}
                        search={c.search as any}
                        className="mb-0.5 flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-white/55 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-[#050509]/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/5 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold tracking-tight">Artist Dashboard</div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}