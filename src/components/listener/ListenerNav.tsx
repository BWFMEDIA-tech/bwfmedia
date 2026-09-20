import { Link } from "@tanstack/react-router";
import { Heart, ListMusic, Sparkles, Target, Trophy, Users } from "lucide-react";

const LINKS = [
  { to: "/for-you", label: "For You", icon: Sparkles },
  { to: "/library", label: "Library", icon: Heart },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/music-match", label: "Music Match", icon: Users },
  { to: "/challenges", label: "Challenges", icon: Target },
  { to: "/wrapped", label: "Wrapped", icon: Trophy },
] as const;

export function ListenerNav() {
  return (
    <nav className="tv-scroll -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to as never}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-tv-line bg-white/[0.05] px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          activeProps={{ className: "border-tv-cyan/60 bg-tv-cyan/10 text-tv-cyan" }}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ListenerPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-tv-base text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-40 pt-6 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
        <div className="mt-5">
          <ListenerNav />
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-tv-line bg-tv-surface p-10 text-center">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/50">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-tv-line bg-gradient-to-br from-tv-violet/20 to-tv-cyan/10 p-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <p className="text-sm font-bold text-white">Sign in to use {what}</p>
        <p className="mt-1 text-sm text-white/60">
          Your listening, likes and follows power everything on this page.
        </p>
      </div>
      <Link
        to="/login"
        className="shrink-0 rounded-full bg-tv-cyan px-6 py-2.5 text-center text-sm font-black text-black transition hover:brightness-110"
      >
        Sign in
      </Link>
    </div>
  );
}

export function RailSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
