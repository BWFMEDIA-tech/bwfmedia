import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

import {
  Compass, TrendingUp, Sparkles, Music2, BarChart2, ListMusic,
  Upload, Sliders, LineChart, DollarSign, Megaphone, Users,
  User, Mic2, Building2, Repeat, UserCog,
  Settings, Bell, CreditCard, ShieldCheck, HelpCircle, LogOut,
  Headphones, Radio, CalendarDays, ShoppingBag, Heart, Store, Network,
  ChevronRight, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — Tunevio" },
      { name: "description", content: "Browse, create, and manage everything on Tunevio from one place." },
    ],
  }),
  component: MorePage,
});

type Item = { label: string; to?: string; icon: LucideIcon; soon?: boolean; onClick?: () => void; danger?: boolean };
type Section = { title: string; items: Item[] };

const SWIPE_THRESHOLD = 96;
const VELOCITY_THRESHOLD = 0.45;

function useSwipeToClose(onClose: () => void) {
  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const currentX = useRef(0);
  const startTime = useRef(0);
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number | null>(null);

  const updateOffset = useCallback((value: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setOffset(value));
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    let dragging = false;

    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // Only start from the top 140px to avoid conflicting with vertical scroll
      if (t.clientY > 140) return;
      dragging = true;
      startY.current = t.clientY;
      startX.current = t.clientX;
      currentY.current = t.clientY;
      currentX.current = t.clientX;
      startTime.current = performance.now();
      updateOffset(0);
    };

    const touchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      currentY.current = t.clientY;
      currentX.current = t.clientX;
      const dy = currentY.current - startY.current;
      const dx = currentX.current - startX.current;
      if (dy > 0 && dy > Math.abs(dx) * 0.6) {
        updateOffset(Math.min(dy * 0.55, 160));
        if (e.cancelable) e.preventDefault();
      }
    };

    const touchEnd = () => {
      if (!dragging) return;
      dragging = false;
      const dy = currentY.current - startY.current;
      const dt = performance.now() - startTime.current;
      const velocity = dy / (dt || 1);
      if (dy > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        updateOffset(0);
        onClose();
      } else {
        updateOffset(0);
      }
    };

    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("touchend", touchEnd, { passive: true });
    el.addEventListener("touchcancel", touchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onClose, updateOffset]);

  return offset;
}

function MorePage() {
  console.log("MorePage render");
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSwipeClose = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  const offset = useSwipeToClose(handleSwipeClose);

  const sections: Section[] = [
    {
      title: "Browse",
      items: [
        { label: "Discover", to: "/discover", icon: Compass },
        { label: "Trending", to: "/charts", icon: TrendingUp },
        { label: "New Releases", to: "/discover", icon: Sparkles },
        { label: "Genres", to: "/discover", icon: Music2 },
        { label: "Charts", to: "/charts", icon: BarChart2 },
        { label: "Featured Playlists", to: "/discover", icon: ListMusic },
      ],
    },
    {
      title: "Artist Tools",
      items: [
        { label: "Upload Music", to: "/upload", icon: Upload },
        { label: "Creator Studio", to: "/studio", icon: Sliders },
        { label: "Analytics", to: "/dashboard", icon: LineChart },
        { label: "Earnings", to: "/earnings", icon: DollarSign },
        { label: "Promotions", to: "/settings/membership", icon: Megaphone },
        { label: "Audience Insights", to: "/dashboard", icon: Users },
      ],
    },
    {
      title: "Profiles",
      items: [
        { label: "Personal Profile", to: "/profile", icon: User },
        { label: "Artist Profile", to: "/artist-dashboard", icon: Mic2 },
        { label: "Label Profile", to: "/settings/artist-info", icon: Building2 },
        { label: "Switch Profiles", to: "/settings/profile", icon: Repeat },
        { label: "Profile Settings", to: "/settings/profile", icon: UserCog },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Settings", to: "/settings", icon: Settings },
        { label: "Notifications", to: "/notifications", icon: Bell },
        { label: "Subscription", to: "/settings/billing", icon: CreditCard },
        { label: "Privacy & Security", to: "/settings/security", icon: ShieldCheck },
        { label: "Help Center", to: "/contact", icon: HelpCircle },
        {
          label: "Logout",
          icon: LogOut,
          danger: true,
          onClick: async () => {
            await signOut();
            navigate({ to: "/" });
          },
        },
      ],
    },
    {
      title: "Coming Soon",
      items: [
        { label: "Podcasts", icon: Headphones, soon: true },
        { label: "Live Audio", icon: Radio, soon: true },
        { label: "Events", to: "/events", icon: CalendarDays },
        { label: "Merchandise", icon: ShoppingBag, soon: true },
        { label: "Fan Clubs", icon: Heart, soon: true },
        { label: "Creator Marketplace", icon: Store, soon: true },
        { label: "Tunevio Network", to: "/network", icon: Network },
      ],
    },
  ];

  return (
    <div
      data-offset={offset}
      className="min-h-screen bg-[#050509] text-white pb-28"
      style={{ transform: `translateY(${Math.round(offset)}px)`, transition: offset === 0 ? "transform 250ms ease" : "none" }}
    >
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050509]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-2 pb-4">
          <div className="mb-2 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
          <div className="flex w-full items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">More</h1>
            <Link to="/search" className="text-xs font-semibold text-white/60 hover:text-white">Search</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="animate-fade-in">
            <h2 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#00E6FF]/80">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {section.items.map((item) => (
                <MoreCard key={item.label} item={item} />
              ))}
            </div>
          </section>
        ))}

        <p className="pt-4 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Tunevio · v1
        </p>
      </div>
    </div>
  );
}

function MoreCard({ item }: { item: Item }) {
  const Icon = item.icon;
  const base =
    "group relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.97]";
  const tone = item.danger
    ? "border-red-500/25 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10"
    : "border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-[#00E6FF]/40 hover:from-[#00E6FF]/10 hover:to-[#C53DFF]/5";

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${
            item.danger
              ? "bg-red-500/15 text-red-300"
              : "bg-white/5 text-[#00E6FF] group-hover:bg-[#00E6FF]/15 group-hover:shadow-[0_0_20px_rgba(0,230,255,0.25)]"
          } transition`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {item.soon ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/50">
            Soon
          </span>
        ) : (
          !item.danger && <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
        )}
      </div>
      <div className={`text-sm font-semibold ${item.danger ? "text-red-300" : "text-white"}`}>
        {item.label}
      </div>
    </>
  );

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={`${base} ${tone}`}>
        {inner}
      </button>
    );
  }
  if (item.soon || !item.to) {
    return <div className={`${base} ${tone} cursor-default opacity-70`}>{inner}</div>;
  }
  return (
    <Link to={item.to} className={`${base} ${tone}`}>
      {inner}
    </Link>
  );
}