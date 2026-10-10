import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { User, Music2, BarChart3, ChevronRight, PanelLeft, LayoutDashboard, Radio, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/tunevio-logo.png.asset.json";

type Leaf = { to: string; label: string; search?: Record<string, string>; params?: { id: string } };
const GROUPS = [
  { key: "music", label: "My Music", icon: Music2, children: [
    { to: "/settings/music-media", label: "Songs & Albums" },
    { to: "/upload", label: "Upload Music & Video" },
    { to: "/distribution", label: "Distribution" },
  ] },
  { key: "performances", label: "Performances", icon: Radio, children: [
    { to: "/go-live", label: "Go Live" },
    { to: "/live", label: "Live Stage" },
    { to: "/play", label: "Play Arena" },
    { to: "/settings/events", label: "Events & Showcases" },
  ] },
  { key: "profile", label: "My Artist Profile", icon: User, children: [
    { to: "/settings/profile", label: "Photo, Banner & Biography" },
    { to: "/settings/social-links", label: "Social Links" },
  ] },
  { key: "analytics", label: "Analytics", icon: BarChart3, children: [
    { to: "/artist-analytics", label: "Streams & Audience Growth" },
    { to: "/earnings", label: "Revenue Reports" },
  ] },
  { key: "community", label: "Fans & Community", icon: Users, children: [
    { to: "/messages", label: "Messages" },
    { to: "/labels", label: "Labels & Teams" },
  ] },
  { key: "settings", label: "Settings", icon: Settings, children: [
    { to: "/settings/billing", label: "Account & Billing" },
    { to: "/settings/notifications", label: "Notifications" },
    { to: "/settings/security", label: "Security" },
    { to: "/settings/appearance", label: "Appearance" },
    { to: "/settings/connected-apps", label: "Connected Apps" },
    { to: "/settings/membership", label: "Membership" },
    { to: "/settings/payouts", label: "Payouts" },
    { to: "/settings/merch", label: "Merch Store" },
    { to: "/settings/broadcast-help", label: "Broadcast Help" },
  ] },
];

export function ArtistDashboardShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setMobileOpen(false);
    const active = GROUPS.find((g) => g.children.some((c) => c.to === pathname));
    if (active) setOpen((p) => ({ ...p, [active.key]: true }));
  }, [pathname]);
  const navLink = (leaf: Leaf) => (
    <Link key={leaf.label} to={leaf.to} params={leaf.params} search={leaf.search as any}
      onClick={() => setMobileOpen(false)} aria-current={pathname === leaf.to ? "page" : undefined}
      className={`block rounded-md px-3 py-2 text-sm transition-colors ${pathname === leaf.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {leaf.label}
    </Link>
  );
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className={`fixed bottom-0 top-[calc(var(--bwf-banner-h,0px)+72px)] left-0 z-40 w-64 border-r border-border bg-card transition-transform lg:sticky lg:top-[calc(var(--bwf-banner-h,0px)+80px)] lg:h-[calc(100vh-80px)] lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center border-b border-border px-3">
          <Link to="/" aria-label="Tunevio home" className={collapsed ? "hidden lg:hidden" : "block"}>
            <img src={logo.url} alt="Tunevio" className="w-36 h-auto" />
          </Link>
        </div>
        <nav aria-label="Artist Dashboard" className="h-[calc(100%-4rem)] overflow-y-auto px-2 py-4">
          <Link to="/artist-dashboard" title="Overview" aria-current={pathname === "/artist-dashboard" ? "page" : undefined}
            className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${pathname === "/artist-dashboard" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <LayoutDashboard className="h-4 w-4 shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Overview</span>
          </Link>
          {GROUPS.map((group) => {
            const active = group.children.some((c) => c.to === pathname);
            const Icon = group.icon;
            return <div key={group.key} className="mb-1">
              <Button variant="ghost" title={group.label} aria-expanded={!!open[group.key]} onClick={() => { setCollapsed(false); setOpen((p) => ({ ...p, [group.key]: !p[group.key] })); }}
                className={`h-auto w-full justify-between px-3 py-2.5 ${active ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
                <span className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4" /><span className={collapsed ? "lg:hidden" : ""}>{group.label}</span></span>
                <ChevronRight className={`${open[group.key] ? "rotate-90" : ""} ${collapsed ? "lg:hidden" : ""}`} />
              </Button>
              {open[group.key] && <div className={`ml-4 mt-1 border-l border-border pl-2 ${collapsed ? "lg:hidden" : ""}`}>
                {group.children.map(navLink)}
                {(group.key === "profile" || group.key === "community") && auth.user && navLink({ to: "/artist/$id", params: { id: auth.user.id }, label: group.key === "profile" ? "View My Artist Profile" : "Followers & Engagement" })}
              </div>}
            </div>;
          })}
        </nav>
      </aside>
      {mobileOpen && <Button variant="ghost" aria-label="Close artist navigation" className="fixed inset-x-0 bottom-0 top-[calc(var(--bwf-banner-h,0px)+72px)] z-30 h-auto rounded-none bg-background/80 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-border bg-background/95 px-4 sm:px-6">
          <Button variant="outline" size="icon" title="Toggle artist menu" aria-label="Toggle artist menu" aria-expanded={mobileOpen || !collapsed} onClick={() => { setMobileOpen((v) => !v); setCollapsed((v) => !v); }}><PanelLeft /></Button>
          <div className="text-sm font-semibold">Artist Dashboard</div>
        </header>
        <main className="min-w-0 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
