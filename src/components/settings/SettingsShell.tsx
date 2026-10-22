import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { settingsGroups } from "@/lib/settings-navigation";

/** General Settings layout — separate from the main menu and the Artist Dashboard sidebar. */
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const groups = settingsGroups(auth.roles);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 md:py-6 lg:flex-row lg:gap-8">
        <aside className="lg:sticky lg:top-[calc(var(--bwf-banner-h,0px)+96px)] lg:h-fit lg:w-64 lg:shrink-0">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold lg:hidden"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Settings menu</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
          </button>
          <nav aria-label="Settings" className={`${mobileOpen ? "block" : "hidden"} mt-2 rounded-lg border border-border bg-card p-2 lg:mt-0 lg:block`}>
            <Link to="/settings" onClick={() => setMobileOpen(false)} aria-current={pathname === "/settings" ? "page" : undefined}
              className={`block rounded-md px-3 py-2.5 text-sm font-semibold ${pathname === "/settings" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              Account Overview
            </Link>
            {groups.map((g) => {
              const isClosed = closed[g.key];
              return (
                <div key={g.key} className="mt-1">
                  <button type="button" aria-expanded={!isClosed} onClick={() => setClosed((p) => ({ ...p, [g.key]: !p[g.key] }))}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {g.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isClosed ? "-rotate-90" : ""}`} />
                  </button>
                  {!isClosed && g.items.map((i) => (
                    <Link key={i.to} to={i.to} onClick={() => setMobileOpen(false)} aria-current={pathname === i.to ? "page" : undefined}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${pathname === i.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      {i.label}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
