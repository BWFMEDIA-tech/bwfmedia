import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

function MorePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#050509] text-white pb-28">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050509]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <h1 className="text-2xl font-black tracking-tight">More</h1>
          <Link to="/search" className="text-xs font-semibold text-white/60 hover:text-white">Search</Link>
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