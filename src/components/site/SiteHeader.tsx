import { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useNavigate, useRouterState } from "@tanstack/react-router";


import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Search,
  Home,
  Radio,
  Mic,
  Compass,
  BarChart3,
  Music,
  Mail,
  Newspaper,
  Calendar,
  ShoppingCart,
  Disc3,
  Trophy,
  LayoutDashboard,
  Download,
} from "lucide-react";
import bwfLogo from "@/assets/tunevio-logo.png.asset.json";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";
import { MessageBell } from "@/components/MessageBell";
import { useCart } from "@/contexts/CartContext";
import { SignedImg } from "@/components/ui/signed-img";
import { useQuery } from "@tanstack/react-query";
import { getSiteNav } from "@/lib/site-nav.functions";
import { artistDashboardDestination, hasArtistTools } from "@/lib/artist-navigation";
import { useLiveStageNavigation } from "@/lib/use-live-stage-navigation";

function HeaderCartButton() {
  const { totalCount, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blood/60 transition-colors text-bone"
    >
      <ShoppingCart size={17} />
      {totalCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-blood text-white text-[10px] font-bold">
          {totalCount}
        </span>
      )}
    </button>
  );
}

type NavItem = { to: string; label: string; icon?: any };

// Main menu: Home · Artist Dashboard (artists) · Live Stage · Discover ▾ · Store ▾ · My Profile
const MENU_GROUPS: { key: string; label: string; items: NavItem[] }[] = [
  { key: "discover", label: "Discover", items: [
    { to: "/discover", label: "Discover Music", icon: Compass },
    { to: "/artists", label: "Artists", icon: Music },
    { to: "/library", label: "Music Library", icon: Disc3 },
    { to: "/videos", label: "Videos", icon: Mic },
    { to: "/charts", label: "Charts", icon: BarChart3 },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/play", label: "Battle Arena", icon: Radio },
    { to: "/blog", label: "Blog", icon: Newspaper },
    { to: "/events", label: "Events", icon: Calendar },
  ] },
  { key: "store", label: "Store", items: [
    { to: "/artist-store", label: "Artist Store", icon: Disc3 },
    { to: "/store", label: "Tunevio Store", icon: ShoppingCart },
  ] },
];

const DEFAULT_PRIMARY: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/artist-dashboard", label: "Artist Dashboard", icon: LayoutDashboard },
  { to: "/live", label: "Live Stage", icon: Radio },
  { to: "#discover", label: "Discover", icon: Compass },
  { to: "#store", label: "Store", icon: ShoppingCart },
  { to: "/profile", label: "My Profile", icon: User },
];

const NAV_ICONS: Record<string, any> = { Home, Compass, Radio, Music, User, LayoutDashboard, ShoppingCart, Disc3, Trophy, BarChart3, Calendar, Newspaper, Mail, Mic };

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const browseRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();
  const stage = useLiveStageNavigation();
  const navigate = useNavigate();
  const pathname = useActivePath();
  const isAdmin = auth.roles.includes("admin");
  const isManager = auth.roles.includes("manager");
  const canBroadcast = isAdmin || isManager;
  // Admin-editable rows (Admin → Navigation Bar); hardcoded defaults apply when none are saved.
  const navQ = useQuery({ queryKey: ["site-nav"], queryFn: () => getSiteNav(), staleTime: 60_000 });
  const rows = (navQ.data?.items ?? []).filter((r) => r.visible).sort((x, y) => x.position - y.position);
  const toItem = (r: { to_path: string; label: string; icon: string }): NavItem => ({ to: r.to_path, label: r.label, icon: NAV_ICONS[r.icon] ?? Music });
  const groupItems = (key: string) => {
    const saved = rows.filter((r) => r.slot === key).map(toItem);
    return saved.length || rows.length ? saved : MENU_GROUPS.find((g) => g.key === key)?.items ?? [];
  };
  const savedPrimary = rows.filter((r) => r.slot === "primary").map(toItem);
  const primarySource: NavItem[] = savedPrimary.length ? savedPrimary : DEFAULT_PRIMARY;
  type Entry = { kind: "link"; to: string; label: string; icon?: any; params?: any; search?: any } | { kind: "group"; key: string; label: string; items: NavItem[] };
  const entries: Entry[] = primarySource.flatMap((item): Entry[] => {
    if (item.to.startsWith("#")) {
      const key = item.to.slice(1);
      const items = groupItems(key);
      return items.length ? [{ kind: "group", key, label: item.label, items }] : [];
    }
    if (item.to === "/artist-dashboard") {
      return hasArtistTools(auth.roles) ? [{ kind: "link", ...item, to: artistDashboardDestination(auth.roles) }] : [];
    }
    if (item.to === "/profile") {
      return [auth.user ? { kind: "link", ...item, to: "/artist/$id", params: { id: auth.user.id } } : { kind: "link", ...item, to: "/login" }];
    }
    if (item.to === "/live") return [{ kind: "link", ...item, to: stage.to, params: stage.live ? stage.params : undefined }];
    return [{ kind: "link", ...item }];
  });
  const primary = entries.filter((e): e is Extract<Entry, { kind: "link" }> => e.kind === "link");
  const groups = entries.filter((e): e is Extract<Entry, { kind: "group" }> => e.kind === "group");
  const accountLinks: NavItem[] = [
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/install", label: "Install Tunevio", icon: Download },
    ...(canBroadcast ? [{ to: "/stream-studio", label: "Stream Studio", icon: Radio }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: BarChart3 }] : []),
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) setBrowseOpen(null);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
    setBrowseOpen(null);
    setProfileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await auth.signOut();
    setProfileOpen(false);
    navigate({ to: "/" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/artists", search: { q } as any });
  };

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));

  return (
    <>
    {/* Solid black cover for the iOS status bar / Dynamic Island area so content never shows through. */}
    <div
      aria-hidden
      className="tunevio-safe-top fixed inset-x-0 top-0 z-[60] pointer-events-none lg:hidden"
      style={{ height: "env(safe-area-inset-top)", background: "#000000" }}
    />
    <nav
      style={{ top: "calc(var(--bwf-banner-h, 0px) + env(safe-area-inset-top))" }}
      className={`tunevio-site-navigation fixed left-0 right-0 z-50 transition-all duration-300 max-lg:!bg-[#000000] max-lg:backdrop-blur-none ${
        scrolled
          ? "backdrop-blur-xl bg-black/90 border-b border-blood/40 shadow-[0_8px_24px_-12px_rgba(225,29,42,0.35)]"
          : "backdrop-blur bg-background/95 border-b border-border"
      }`}
    >
      <div className="w-full px-4 md:px-8 h-[72px] md:h-20 lg:h-20 flex items-center gap-4">
        {/* Mobile hamburger (left) */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-bone shrink-0"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <RouterLink to="/" className="flex min-w-0 items-center shrink-0 mr-2">
          <img src={bwfLogo.url} alt="Tunevio" className="h-auto w-36 sm:w-44 xl:w-48 object-contain" />
        </RouterLink>

        {/* Desktop primary nav */}
        <div className="hidden lg:flex items-center gap-1 mx-auto">
          <div className="flex items-center gap-1" ref={browseRef}>
          {entries.map((entry) => {
            if (entry.kind === "group") {
              const group = entry;
              const groupActive = group.items.some((i) => isActive(i.to));
              const isOpen = browseOpen === group.key;
              return (
                <div key={group.key} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setBrowseOpen(isOpen ? null : group.key)}
                    className={`inline-flex items-center gap-1 px-2 py-2 text-xs xl:text-sm font-medium transition-colors ${
                      isOpen || groupActive ? "text-bone" : "text-bone/65 hover:text-bone"
                    }`}
                  >
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 mt-2 w-60 rounded-xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden p-1.5"
                      >
                        {group.items.map((sub) => (
                          <RouterLink
                            key={`${sub.to}-${sub.label}`}
                            to={sub.to}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone/80 rounded-lg hover:bg-blood/15 hover:text-bone transition-colors"
                          >
                            <span className="w-7 h-7 grid place-items-center rounded-md bg-blood/15 text-blood">
                              <sub.icon size={14} />
                            </span>
                            {sub.label}
                          </RouterLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
            const item = entry;
            const active = isActive(item.to);
            return (
              <RouterLink
                key={item.label}
                to={item.to}
                params={item.params}
                search={item.search as any}
                aria-current={active ? "page" : undefined}
                className={`relative px-2 py-2 text-xs xl:text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "text-bone" : "text-bone/65 hover:text-bone"
                }`}
              >
                <span className={item.label === "Live Stage" ? "stage-navigation-indicator" : undefined} data-live={item.label === "Live Stage" ? stage.live : undefined}>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-blood rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </RouterLink>
            );
          })}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden 2xl:flex shrink-0 items-center gap-2 w-40 px-3.5 h-10 rounded-full border border-white/10 bg-white/[0.04] focus-within:border-blood/60 focus-within:bg-white/[0.07] transition-colors"
        >
          <Search size={15} className="text-bone/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, shows…"
            className="min-w-0 flex-1 bg-transparent text-sm text-bone placeholder:text-bone/40 outline-none"
          />
        </form>

        {/* Right cluster */}
        <div className="hidden lg:flex shrink-0 items-center gap-2 whitespace-nowrap">
          <HeaderCartButton />
          {auth.isAuthenticated ? (
            <>
              <NotificationBell />
              <MessageBell />
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-1.5 p-1 pr-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {auth.avatarUrl ? (
                    <SignedImg src={auth.avatarUrl} alt={auth.displayName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blood grid place-items-center text-white text-xs font-bold">
                      {auth.displayName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <ChevronDown size={13} className="text-bone/60" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d0d12]/98 backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/10">
                        <div className="text-sm font-semibold text-bone truncate">{auth.displayName || "User"}</div>
                        <div className="text-[11px] text-bone/50 truncate">{auth.user?.email}</div>
                      </div>
                      {accountLinks.map((l) => (
                        <RouterLink key={l.to} to={l.to} className="flex items-center gap-2 px-4 py-2.5 text-sm text-bone/80 hover:bg-white/5">
                          <l.icon size={15} /> {l.label}
                        </RouterLink>
                      ))}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-bone/80 hover:bg-white/5 border-t border-white/10"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <RouterLink
                to="/login"
                className="px-4 py-2 text-sm font-medium text-bone/80 hover:text-bone transition-colors"
              >
                Sign In
              </RouterLink>
              <RouterLink
                to="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blood text-white text-sm font-semibold hover:bg-blood-glow transition-colors"
              >
                Sign Up
              </RouterLink>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:hidden">
          {auth.isAuthenticated && <NotificationBell />}
          <HeaderCartButton />
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/10 bg-[#06060a]/98 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Mobile search */}
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 px-3.5 h-11 rounded-full border border-white/10 bg-white/5"
              >
                <Search size={15} className="text-bone/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search artists, shows…"
                  className="flex-1 bg-transparent text-sm text-bone placeholder:text-bone/40 outline-none"
                />
              </form>

              <div>
                <div className="text-xs text-muted-foreground mb-3 px-1">Your music. Your stage. Your audience.</div>
                <div className="font-cond text-[10px] tracking-[0.4em] uppercase text-bone/40 mb-2 px-1">Main Menu</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {primary.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <RouterLink
                        key={item.label}
                        to={item.to}
                        params={item.params}
                        search={item.search as any}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-w-0 items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          active
                            ? "border-blood bg-blood/15 text-bone"
                            : "border-white/10 bg-white/[0.03] text-bone/75 hover:text-bone"
                        }`}
                      >
                        <item.icon size={15} data-live={item.label === "Live Stage" ? stage.live : undefined} className={`stage-navigation-indicator shrink-0 ${active ? "text-blood" : "text-bone/50"}`} />
                        <span>{item.label}</span>
                      </RouterLink>
                    );
                  })}
                </div>
              </div>

              {groups.map((group) => (
                <details key={group.key} className="group" open={group.items.some((i) => isActive(i.to))}>
                  <summary className="flex cursor-pointer list-none items-center justify-between px-1 py-2 font-cond text-[10px] tracking-[0.4em] uppercase text-bone/60">
                    {group.label}
                    <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {group.items.map((item) => (
                      <RouterLink
                        key={`${item.to}-${item.label}`}
                        to={item.to}
                        aria-current={isActive(item.to) ? "page" : undefined}
                        className="flex min-w-0 items-center gap-2 px-3 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-bone/75 hover:text-bone transition-colors"
                      >
                        <item.icon size={15} className="shrink-0 text-blood/80" />
                        <span className="min-w-0">{item.label}</span>
                      </RouterLink>
                    ))}
                  </div>
                </details>
              ))}


              <div className="pt-3 border-t border-white/10">
                {auth.isAuthenticated ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 px-1 py-2">
                      {auth.avatarUrl ? (
                        <SignedImg src={auth.avatarUrl} alt={auth.displayName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blood grid place-items-center text-white text-sm font-bold">
                          {auth.displayName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-bone truncate">{auth.displayName || "User"}</div>
                        <div className="text-[11px] text-bone/50 truncate">{auth.user?.email}</div>
                      </div>
                    </div>
                    {accountLinks.map((l) => (
                      <RouterLink key={l.to} to={l.to} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-bone/80 hover:bg-white/5">
                        <l.icon size={15} /> {l.label}
                      </RouterLink>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-bone/80 hover:bg-white/5"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <RouterLink
                      to="/login"
                      className="text-center px-4 py-3 rounded-md border border-white/15 text-sm font-medium text-bone/80"
                    >
                      Sign In
                    </RouterLink>
                    <RouterLink
                      to="/signup"
                      className="text-center px-4 py-3 rounded-md bg-blood text-white text-sm font-semibold"
                    >
                      Sign Up
                    </RouterLink>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    </>
  );
}
