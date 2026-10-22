import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { settingsGroups } from "@/lib/settings-navigation";
import { useAuth } from "@/lib/auth-context";
import { SignedImg } from "@/components/ui/signed-img";



export function AccountOverview() {
  const auth = useAuth();
  const groups = settingsGroups(auth.roles);
  return <div className="swara-account mx-auto w-full max-w-2xl pb-12">
    <header className="mb-10 flex flex-col items-center border-b border-border pb-10 pt-8 text-center">
      <span className="mb-5 grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-secondary text-4xl font-semibold">
        {auth.avatarUrl ? <SignedImg src={auth.avatarUrl} alt={auth.displayName} className="h-full w-full object-cover" /> : auth.displayName.slice(0, 2).toUpperCase()}
      </span>
      <h1 className="text-2xl font-semibold">{auth.displayName}</h1>
      <p className="mt-2 max-w-full break-all text-sm text-muted-foreground">{auth.user?.email}</p>
    </header>
    {groups.map(group => <section key={group.key} className="mb-10">
      <h2 className="mb-3 text-xs font-medium uppercase text-muted-foreground">{group.label}</h2>
      <div>{group.items.map(item => <Link key={item.to} to={item.to} className="flex min-h-16 items-center gap-4 border-b border-border/50 py-4 text-base transition-colors hover:text-primary"><span className="min-w-0 flex-1">{item.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>)}</div>
    </section>)}
  </div>;
}