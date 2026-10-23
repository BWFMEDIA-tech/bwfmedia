// ============= Full file contents =============

import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Radio, Inbox, User, Swords } from "lucide-react";
import arenaLogo from "@/assets/go-live-logo.png.asset.json";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { artistDashboardDestination } from "@/lib/artist-navigation";
import { UnreadBadge, useUnreadCount } from "@/components/UnreadBadge";
import { LiveRosterSheet } from "@/components/site/LiveRosterSheet";
import { useLiveStageNavigation } from "@/lib/use-live-stage-navigation";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: Home, match: (p) => p === "/" || p === "/home" },
  { to: "/messages", label: "Inbox", icon: Inbox, match: (p) => p.startsWith("/messages") },
  { to: "/play", label: "Arena", icon: Swords, match: (p) => p.startsWith("/play") },
  { to: "/live", label: "Watch Now", icon: Radio, match: (p) => p === "/live" },
  { to: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/settings") },
];

export function MobileBottomNav() {
  const auth = useAuth();
  const stage = useLiveStageNavigation();
  const inboxCount = useUnreadCount("messages");
  const [rosterOpen, setRosterOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bwf-mobile-nav-h", "calc(64px + env(safe-area-inset-bottom))");
    return () => {
      root.style.removeProperty("--bwf-mobile-nav-h");
    };
  }, []);
  return (
    <>
    <nav
      aria-label="Primary"
      className="tunevio-phone-navigation fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="mx-auto max-w-md grid"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname) || (tab.to === "/profile" && auth.user ? pathname.startsWith(`/artist/${auth.user.id}`) : false) || (tab.to === "/live" && (pathname.startsWith("/stream/") || pathname.startsWith("/stage/")));
          const Icon = tab.icon;
          const dashboardTo = artistDashboardDestination(auth.roles);
          // The Arena entry follows the real live broadcast: when Tunevio is actually live
          // it opens that stream/stage, otherwise it stays on the Battle Arena.
          const followsStage = tab.to === "/play";
          const to = followsStage ? (stage.live ? stage.to : tab.to) : tab.to === "/artist-dashboard" ? dashboardTo : tab.to === "/profile" ? (auth.user ? "/artist/$id" : "/login") : tab.to;
          const className = cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          );
          const content = (
            <>
              <span className={cn("relative", tab.to === "/live" && "stage-navigation-indicator")} data-live={tab.to === "/live" ? stage.live : undefined}>
                {tab.to === "/play" ? <img src={arenaLogo.url} alt="" data-live={tab.to === "/play" ? stage.live : undefined} className={cn("h-9 w-9 -my-2 object-contain transition-transform stage-navigation-indicator", active && "scale-110 drop-shadow-[0_0_8px_var(--primary)]")} /> : <Icon className="h-5 w-5" />}
                {tab.to === "/messages" && <UnreadBadge count={inboxCount} className="-top-1.5 -right-2.5" />}
              </span>
              <span className="w-full text-center leading-tight">{tab.label}</span>
            </>
          );
          return (
            <li key={tab.to} className="flex">
              {tab.to === "/live" ? (
                <button
                  type="button"
                  onClick={() => setRosterOpen(true)}
                  aria-expanded={rosterOpen}
                  aria-controls="live-roster"
                  aria-label="See people live on Tunevio"
                  data-stage-live={stage.live}
                  className={cn(className, "bg-transparent")}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </button>
              ) : (
                <Link
                  to={to}
                  params={followsStage ? (stage.live ? stage.params : undefined) : tab.to === "/profile" && auth.user ? { id: auth.user.id } : undefined}
                  search={tab.to === "/artist-dashboard" && dashboardTo === "/signup" ? { as: "artist" } as any : undefined}
                  className={className}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
    <LiveRosterSheet open={rosterOpen} onOpenChange={setRosterOpen} />
    </>
  );
}

export function MobileBottomNavSpacer() {
  return <div aria-hidden className="h-16 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />;
}
