import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Radio, LayoutDashboard, Compass, User } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { artistDashboardDestination } from "@/lib/artist-navigation";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  { to: "/discover", label: "Discover", icon: Compass, match: (p) => p.startsWith("/discover") || p.startsWith("/search") },
  { to: "/live", label: "Live Stage", icon: Radio, match: (p) => p === "/live" },
  { to: "/artist-dashboard", label: "Artist Hub", icon: LayoutDashboard, match: (p) => p.startsWith("/artist-dashboard") },
  { to: "/profile", label: "My Account", icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/settings") },
];

export function MobileBottomNav() {
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bwf-mobile-nav-h", "64px");
    return () => {
      root.style.removeProperty("--bwf-mobile-nav-h");
    };
  }, []);
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const dashboardTo = artistDashboardDestination(auth.roles);
          const to = tab.to === "/artist-dashboard" ? dashboardTo : tab.to === "/profile" ? (auth.user ? "/artist/$id" : "/login") : tab.to;
          return (
            <li key={tab.to} className="flex">
              <Link
                to={to}
                params={tab.to === "/profile" && auth.user ? { id: auth.user.id } : undefined}
                search={tab.to === "/artist-dashboard" && dashboardTo === "/signup" ? { as: "artist" } as any : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(0,230,255,0.7)]")} />
                <span>{tab.label}</span>
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