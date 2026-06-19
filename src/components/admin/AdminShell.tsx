import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, Radio, Star, PlayCircle, Calendar, ShoppingBag, Mic2,
  Receipt, Banknote, BarChart3, MessageSquare, LifeBuoy, Settings, Shield, ScrollText,
  Menu, Search, Bell, ChevronDown, LogOut, User as UserIcon, Crown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Item = { to: string; label: string; icon: any; badge?: number };

const NAV: Item[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/streams", label: "Shows & Live Streams", icon: Radio },
  { to: "/admin/play-arena", label: "Play Arena", icon: Mic2 },
  { to: "/admin/artists", label: "Artists", icon: Star },
  { to: "/admin/content", label: "Content", icon: PlayCircle },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/merch", label: "Merch Store", icon: ShoppingBag },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/payouts", label: "Payouts", icon: Banknote },
  { to: "/admin/analytics", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/tickets", label: "Support Tickets", icon: LifeBuoy },
  { to: "/admin/settings", label: "System Settings", icon: Settings },
  { to: "/admin/security", label: "Security", icon: Shield },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const isAdmin = auth.roles.includes("admin");

  useEffect(() => { setMobileOpen(false); setProfileMenu(false); }, [pathname]);

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, auth.rolesLoading, isAdmin, navigate]);

  if (auth.loading || auth.rolesLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#050509] text-white/60 text-sm">Loading admin…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050509] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-[#0a0a14] transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="text-xl font-black tracking-tight">
            <span className="text-white">BWF</span>
            <span className="ml-1 text-[10px] font-bold tracking-[0.3em] text-violet-400">NETWORK</span>
          </div>
        </div>
        <div className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400">
          Admin Panel
        </div>
        <nav className="px-2 pb-4">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to + "/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mb-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-blue-600/90 to-blue-500/70 text-white shadow-[0_4px_20px_-4px_rgba(59,130,246,0.5)]"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-2 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-600/15 to-violet-600/10 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-300">
            <Crown className="h-3 w-3" /> BWF PRO ADMIN
          </div>
          <div className="mt-1 text-xs text-white/70">Manage your network like a pro.</div>
          <Link to="/admin/settings" className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500">
            Manage Plan
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
          <Link to="/admin/profile" className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
            <Avatar url={auth.avatarUrl} name={auth.displayName} />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">{auth.displayName || "Admin"}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Super Admin</div>
            </div>
          </Link>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-[#050509]/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/5 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              placeholder="Search for users, shows, content…"
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-white/30 focus:border-blue-500/50"
            />
          </div>
          <button className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:bg-white/5">
            <Bell className="h-4 w-4" />
          </button>
          <Link to="/admin/settings" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:bg-white/5">
            <Settings className="h-4 w-4" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setProfileMenu((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 hover:bg-white/5"
            >
              <Avatar url={auth.avatarUrl} name={auth.displayName} size={28} />
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold leading-tight">{auth.displayName || "Admin"}</div>
                <div className="text-[10px] text-white/40">Super Admin</div>
              </div>
              <ChevronDown className="h-3 w-3 text-white/60" />
            </button>
            {profileMenu && (
              <div className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a14] shadow-2xl">
                <Link to="/admin/profile" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5">
                  <UserIcon className="h-4 w-4" /> Admin Profile
                </Link>
                <Link to="/admin/settings" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5">
                  <Settings className="h-4 w-4" /> System Settings
                </Link>
                <button
                  onClick={() => { auth.signOut(); navigate({ to: "/" }); }}
                  className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  const initials = (name || "A").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return url ? (
    <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold"
    >
      {initials}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0d0d18] p-5 ${className}`}>{children}</div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-white/30" />
      <div className="text-sm font-semibold text-white/80">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-xs text-white/40">{hint}</div>}
    </div>
  );
}