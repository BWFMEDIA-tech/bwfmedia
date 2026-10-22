import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Radio, Inbox, User, Video } from "lucide-react";
import goLiveLogo from "@/assets/go-live-logo.png.asset.json";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { artistDashboardDestination } from "@/lib/artist-navigation";
import { UnreadBadge, useUnreadCount } from "@/components/UnreadBadge";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: Home, match: (p) => p === "/" || p === "/home" },
  { to: "/messages", label: "Inbox", icon: Inbox, match: (p) => p.startsWith("/messages") },
  { to: "/go-live", label: "Go Live", icon: Video, match: (p) => p.startsWith("/go-live") },
  { to: "/live", label: "Live Stage", icon: Radio, match: (p) => p === "/live" },
  { to: "/profile", label: "My Account", icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/settings") },
];

export function MobileBottomNav() {
  const auth = useAuth();
  const inboxCount = useUnreadCount("messages");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bwf-mobile-nav-h", "calc(64px + env(safe-area-inset-bottom))");
    return () => {
      root.style.removeProperty("--bwf-mobile-nav-h");
    };
  }, []);
  return (
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
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const dashboardTo = artistDashboardDestination(auth.roles);
          const to = tab.to === "/artist-dashboard" ? dashboardTo : tab.to === "/profile" ? (auth.user ? "/artist/$id" : "/login") : tab.to === "/go-live" ? (auth.user ? "/go-live" : "/login") : tab.to;
          return (
            <li key={tab.to} className="flex">
              <Link
                to={to}
                params={tab.to === "/profile" && auth.user ? { id: auth.user.id } : undefined}
                search={tab.to === "/artist-dashboard" && dashboardTo === "/signup" ? { as: "artist" } as any : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  {tab.to === "/go-live" ? <img src={goLiveLogo.url} alt="" className={cn("h-9 w-9 -my-2 object-contain transition-transform", active && "scale-110 drop-shadow-[0_0_8px_var(--primary)]")} /> : <Icon className="h-5 w-5" />}
                  {tab.to === "/messages" && <UnreadBadge count={inboxCount} className="-top-1.5 -right-2.5" />}
                </span>
                <span className="w-full text-center leading-tight">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileBottomNavSpacer() {
  return <div aria-hidden className="h-16 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />;
}
