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
  Camera,
  Star,
  Mail,
  Newspaper,
  Calendar,
  ShoppingCart,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";
import { MessageBell } from "@/components/MessageBell";
import { useCart } from "@/contexts/CartContext";

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

const PRIMARY: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/play", label: "Play Arena", icon: Music },
  { to: "/live", label: "Live Shows", icon: Radio },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/videos", label: "Videos", icon: Mic },
  { to: "/dashboard", label: "Charts", icon: BarChart3 },
];

const BROWSE: NavItem[] = [
  { to: "/studio", label: "Book a Shoot", icon: Camera },
  { to: "/off-the-block", label: "Off Da Block", icon: Star },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/blog", label: "Blog", icon: Newspaper },
  { to: "/contact", label: "Contact", icon: Mail },
];

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [query, setQuery] = useState("");
  const browseRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useActivePath();
  const isAdmin = auth.roles.includes("admin");
  const isManager = auth.roles.includes("manager");
  const canBroadcast = isAdmin || isManager;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) setBrowseOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
    setBrowseOpen(false);
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-black/90 border-b border-blood/40 shadow-[0_8px_24px_-12px_rgba(225,29,42,0.35)]"
          : "backdrop-blur bg-black/50 border-b border-white/5"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center gap-4">
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
        <RouterLink to="/" className="flex items-center gap-2 shrink-0 md:ml-12 mr-2">
          <img src={bwfLogo} alt="BWF Network" className="h-10 md:h-14 lg:h-16 w-auto object-contain" />
        </RouterLink>

        {/* Desktop primary nav */}
        <div className="hidden lg:flex items-center gap-1 mx-auto">
          {PRIMARY.map((item) => {
            const active = isActive(item.to);
            return (
              <RouterLink
                key={item.label}
                to={item.to}
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-bone" : "text-bone/65 hover:text-bone"
                }`}
              >
                {item.label}
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

          {/* Browse dropdown */}
          <div className="relative" ref={browseRef}>
            <button
              onClick={() => setBrowseOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                browseOpen ? "text-bone" : "text-bone/65 hover:text-bone"
              }`}
            >
              Browse
              <ChevronDown size={14} className={`transition-transform ${browseOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {browseOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0d0d12]/98 backdrop-blur-xl shadow-2xl overflow-hidden p-1.5"
                >
                  {BROWSE.map((item) => (
                    <RouterLink
                      key={item.label}
                      to={item.to}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone/80 rounded-lg hover:bg-blood/15 hover:text-bone transition-colors"
                    >
                      <span className="w-7 h-7 grid place-items-center rounded-md bg-blood/15 text-blood">
                        <item.icon size={14} />
                      </span>
                      {item.label}
                    </RouterLink>
                  ))}
                  {canBroadcast && (
                    <>
                      <div className="h-px my-1.5 bg-white/10" />
                      <RouterLink
                        to="/stream-studio"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone/80 rounded-lg hover:bg-blood/15 hover:text-bone transition-colors"
                      >
                        <span className="w-7 h-7 grid place-items-center rounded-md bg-blood text-white">
                          <Radio size={14} />
                        </span>
                        Stream Studio
                      </RouterLink>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden lg:flex items-center gap-2 w-48 lg:w-72 px-3.5 h-10 rounded-full border border-white/10 bg-white/[0.04] focus-within:border-blood/60 focus-within:bg-white/[0.07] transition-colors"
        >
          <Search size={15} className="text-bone/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, shows…"
            className="flex-1 bg-transparent text-sm text-bone placeholder:text-bone/40 outline-none"
          />
        </form>

        {/* Right cluster */}
        <div className="hidden lg:flex items-center gap-2">
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
                    <img src={auth.avatarUrl} alt={auth.displayName} className="w-8 h-8 rounded-full object-cover" />
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
                      <RouterLink to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-bone/80 hover:bg-white/5">
                        <User size={15} /> Profile
                      </RouterLink>
                      <RouterLink to="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-bone/80 hover:bg-white/5">
                        <Settings size={15} /> Settings
                      </RouterLink>
                      {isAdmin && (
                        <RouterLink to="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-bone/80 hover:bg-white/5">
                          <BarChart3 size={15} /> Admin
                        </RouterLink>
                      )}
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
        <div className="lg:hidden">
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
                <div className="font-cond text-[10px] tracking-[0.4em] uppercase text-bone/40 mb-2 px-1">Browse</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRIMARY.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <RouterLink
                        key={item.label}
                        to={item.to}
                        className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          active
                            ? "border-blood bg-blood/15 text-bone"
                            : "border-white/10 bg-white/[0.03] text-bone/75 hover:text-bone"
                        }`}
                      >
                        <item.icon size={15} className={active ? "text-blood" : "text-bone/50"} />
                        {item.label}
                      </RouterLink>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="font-cond text-[10px] tracking-[0.4em] uppercase text-bone/40 mb-2 px-1">More</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {BROWSE.map((item) => (
                    <RouterLink
                      key={item.label}
                      to={item.to}
                      className="flex items-center gap-2 px-3 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-bone/75 hover:text-bone transition-colors"
                    >
                      <item.icon size={15} className="text-blood/80" />
                      {item.label}
                    </RouterLink>
                  ))}
                  {canBroadcast && (
                    <RouterLink
                      to="/stream-studio"
                      className="flex items-center gap-2 px-3 py-3 rounded-lg border border-blood/40 bg-blood/10 text-sm text-bone font-medium"
                    >
                      <Radio size={15} className="text-blood" /> Stream Studio
                    </RouterLink>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                {auth.isAuthenticated ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 px-1 py-2">
                      {auth.avatarUrl ? (
                        <img src={auth.avatarUrl} alt={auth.displayName} className="w-9 h-9 rounded-full object-cover" />
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
                    <RouterLink to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-bone/80 hover:bg-white/5">
                      <User size={15} /> Profile
                    </RouterLink>
                    <RouterLink to="/settings" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-bone/80 hover:bg-white/5">
                      <Settings size={15} /> Settings
                    </RouterLink>
                    {isAdmin && (
                      <RouterLink to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-bone/80 hover:bg-white/5">
                        <BarChart3 size={15} /> Admin
                      </RouterLink>
                    )}
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
  );
}