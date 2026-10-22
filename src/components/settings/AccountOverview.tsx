import { Link } from "@tanstack/react-router";
import { ChevronRight, User, CreditCard, Bell, Shield, Palette, Link2, Radio, Store, MessageCircle, Music2, HelpCircle, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SignedImg } from "@/components/ui/signed-img";

const groups = [
  { title: "General", items: [
    { to: "/settings/profile", label: "Profile", icon: User },
    { to: "/settings/billing", label: "Manage subscriptions", icon: CreditCard },
    { to: "/settings/appearance", label: "Appearance & playback", icon: Palette },
    { to: "/settings/notifications", label: "Notifications", icon: Bell },
    { to: "/settings/security", label: "Security", icon: Shield },
    { to: "/settings/connected-apps", label: "Connected apps", icon: Link2 },
  ] },
  { title: "Your tools", items: [
    { to: "/library", label: "Music library", icon: Music2 },
    { to: "/messages", label: "Inbox", icon: MessageCircle },
    { to: "/go-live", label: "Go live", icon: Radio },
    { to: "/artist-store/manage", label: "Artist store", icon: Store },
    { to: "/settings/payouts", label: "Payouts", icon: Wallet },
    { to: "/help", label: "Help & support", icon: HelpCircle },
  ] },
] as const;

export function AccountOverview() {
  const auth = useAuth();
  return <div className="swara-account mx-auto w-full max-w-2xl pb-12">
    <header className="mb-10 flex flex-col items-center border-b border-border pb-10 pt-8 text-center">
      <span className="mb-5 grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-secondary text-4xl font-semibold">
        {auth.avatarUrl ? <SignedImg src={auth.avatarUrl} alt={auth.displayName} className="h-full w-full object-cover" /> : auth.displayName.slice(0, 2).toUpperCase()}
      </span>
      <h1 className="text-2xl font-semibold">{auth.displayName}</h1>
      <p className="mt-2 max-w-full break-all text-sm text-muted-foreground">{auth.user?.email}</p>
    </header>
    {groups.map(group => <section key={group.title} className="mb-10">
      <h2 className="mb-3 text-xs font-medium uppercase text-muted-foreground">{group.title}</h2>
      <div>{group.items.map(item => <Link key={item.to} to={item.to} className="flex min-h-16 items-center gap-4 border-b border-border/50 py-4 text-base transition-colors hover:text-primary"><item.icon className="h-5 w-5 text-muted-foreground" /><span className="min-w-0 flex-1">{item.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>)}</div>
    </section>)}
  </div>;
}