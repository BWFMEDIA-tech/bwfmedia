import { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, Settings, ChevronDown } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";

const baseLinks: Array<{ href?: string; to?: string; label: string; adminOnly?: boolean }> = [
  { to: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#why", label: "Why BWF" },
  { href: "/#audience", label: "Audience" },
  { to: "/contact", label: "Contact" },
  { to: "/live", label: "Live Now" },
  { to: "/live-review", label: "Live Review" },
  { to: "/stream-studio", label: "Stream Studio", adminOnly: true },
  { to: "/studio", label: "Studio" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const isAdmin = auth.roles.includes("admin");
  const links = baseLinks.filter((l) => !l.adminOnly || isAdmin);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    setProfileOpen(false);
    navigate({ to: "/" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-black/85 border-b border-blood/40"
          : "backdrop-blur bg-black/40 border-b border-white/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        {/* Logo */}
        <RouterLink to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
        </RouterLink>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6">
          {links.map((l) =>
            l.to ? (
              <RouterLink
                key={l.label}
                to={l.to}
                className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
              >
                {l.label}
              </RouterLink>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden lg:flex items-center gap-3">
          {auth.isAuthenticated ? (
            <>
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                {auth.avatarUrl ? (
                  <img
                    src={auth.avatarUrl}
                    alt={auth.displayName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blood flex items-center justify-center text-white text-xs font-bold">
                    {auth.displayName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone/80">
                  {auth.displayName}
                </span>
                <ChevronDown size={14} className="text-bone/50" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-[#0d0d18] shadow-xl overflow-hidden"
                  >
                    <RouterLink
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-bone/80 hover:bg-white/5 transition-colors"
                    >
                      <User size={16} />
                      Profile
                    </RouterLink>
                    <RouterLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-bone/80 hover:bg-white/5 transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </RouterLink>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-bone/80 hover:bg-white/5 transition-colors border-t border-white/10"
                    >
                      <LogOut size={16} />
                      Sign Out
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
                className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase px-4 py-2 text-bone/80 hover:text-bone transition-colors"
              >
                Sign In
              </RouterLink>
              <RouterLink
                to="/signup"
                className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase px-4 py-2 bg-blood text-white hover:bg-blood-glow transition-colors"
              >
                Sign Up
              </RouterLink>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 text-bone hover:text-bone/80 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="lg:hidden border-t border-white/10 bg-black/95 backdrop-blur overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map((l) =>
                l.to ? (
                  <RouterLink
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-white/10"
                  >
                    {l.label}
                  </RouterLink>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-white/10"
                  >
                    {l.label}
                  </a>
                ),
              )}

              {/* Mobile auth */}
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                {auth.isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-1 py-2">
                      {auth.avatarUrl ? (
                        <img
                          src={auth.avatarUrl}
                          alt={auth.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blood flex items-center justify-center text-white text-xs font-bold">
                          {auth.displayName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/80">
                        {auth.displayName}
                      </span>
                    </div>
                    <RouterLink
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/80 hover:text-bone py-2"
                    >
                      Profile
                    </RouterLink>
                    <RouterLink
                      to="/settings"
                      onClick={() => setOpen(false)}
                      className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/80 hover:text-bone py-2"
                    >
                      Settings
                    </RouterLink>
                    <button
                      onClick={() => {
                        setOpen(false);
                        handleSignOut();
                      }}
                      className="text-left font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/80 hover:text-bone py-2"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <RouterLink
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/80 hover:text-bone py-2"
                    >
                      Sign In
                    </RouterLink>
                    <RouterLink
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="font-cond font-bold tracking-[0.2em] text-xs uppercase px-4 py-3 bg-blood text-white text-center"
                    >
                      Sign Up
                    </RouterLink>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
