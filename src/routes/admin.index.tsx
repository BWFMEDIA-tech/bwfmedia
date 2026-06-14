import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Radio,
  Users,
  BarChart3,
  ShieldCheck,
  Calendar,
  Mail,
  ListOrdered,
  Video,
  Activity,
  ScrollText,
  ShoppingBag,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Control Center — BWF Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

const tiles = [
  { to: "/admin/dashboard", icon: LayoutDashboard, title: "Live Dashboard", desc: "Real-time streams, tips, bans, word filter." },
  { to: "/admin/ops", icon: Activity, title: "Live Ops Feed", desc: "Realtime activity + global stream kill switch." },
  { to: "/stream-studio", icon: Video, title: "Stream Studio", desc: "Launch and control live broadcasts." },
  { to: "/admin/streams", icon: Radio, title: "Network Streams", desc: "Manage every stream across the network." },
  { to: "/admin/users", icon: Users, title: "User Management", desc: "Assign roles, view accounts, manage talent." },
  { to: "/admin/analytics", icon: BarChart3, title: "Global Analytics", desc: "Network-wide revenue, content, engagement." },
  { to: "/admin/audit", icon: ScrollText, title: "Audit Log", desc: "Every admin action across the platform." },
  { to: "/admin/live-queue", icon: ListOrdered, title: "Live Review Queue", desc: "Approve submissions for live shows." },
  { to: "/admin/bookings", icon: Calendar, title: "Bookings", desc: "Studio and block booking requests." },
  { to: "/admin/cancellation-emails", icon: Mail, title: "Email Health", desc: "Cancellation emails & dedupe outcomes." },
  { to: "/admin/merch", icon: ShoppingBag, title: "Merch Marketplace", desc: "Shopify stores, products, commissions." },
] as const;

function AdminHome() {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAdmin = auth.roles.includes("admin");

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-6 w-6 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300/80">BWFNetwork</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Control Center</h1>
        <p className="mt-2 text-white/60">
          Welcome, {auth.displayName}. Full platform ownership at your command.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.06]"
            >
              <t.icon className="h-6 w-6 text-violet-300 transition group-hover:scale-110" />
              <h2 className="mt-4 text-lg font-semibold">{t.title}</h2>
              <p className="mt-1 text-sm text-white/55">{t.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}