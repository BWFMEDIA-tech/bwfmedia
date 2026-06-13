import { Link, useRouterState } from "@tanstack/react-router";
import { User, Mic2, Link2, Music, CreditCard, Bell, Palette, Shield, Receipt, Plug, HelpCircle, ExternalLink, Calendar, ShoppingBag } from "lucide-react";

const items = [
  { to: "/settings/profile", label: "Profile", icon: User },
  { to: "/settings/artist-info", label: "Artist Info", icon: Mic2 },
  { to: "/settings/social-links", label: "Social Links", icon: Link2 },
  { to: "/settings/music-media", label: "Music & Media", icon: Music },
  { to: "/settings/events", label: "Upcoming Events", icon: Calendar },
  { to: "/settings/merch", label: "Merch Store", icon: ShoppingBag },
  { to: "/settings/membership", label: "Membership", icon: CreditCard },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/settings/appearance", label: "Appearance", icon: Palette },
  { to: "/settings/security", label: "Security", icon: Shield },
  { to: "/settings/billing", label: "Billing", icon: Receipt },
  { to: "/settings/connected-apps", label: "Connected Apps", icon: Plug },
] as const;

export function SettingsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 px-3">Settings</div>
      <nav className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-gradient-to-r from-red-600/30 to-red-600/5 text-white border border-red-600/40" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-red-500" : ""}`} />
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><HelpCircle className="h-4 w-4 text-red-500" /> Need Help?</div>
        <p className="mt-1.5 text-xs text-white/60">Visit our Help Center for guides and support.</p>
        <a href="/contact" className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-600/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-500 hover:bg-red-600/10">
          <ExternalLink className="h-3 w-3" /> Visit Help Center
        </a>
      </div>
    </aside>
  );
}