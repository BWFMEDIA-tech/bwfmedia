import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Swords, PlusCircle, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  { to: "/play", label: "Arena", icon: Swords, match: (p) => p === "/play" || p.startsWith("/play/") || p.startsWith("/play.") },
  { to: "/upload", label: "Upload", icon: PlusCircle, match: (p) => p.startsWith("/upload") },
  { to: "/search", label: "Search", icon: Search, match: (p) => p.startsWith("/search") },
  { to: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
          return (
            <li key={tab.to} className="flex">
              <Link
                to={tab.to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-[#00E6FF]" : "text-white/60 hover:text-white",
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