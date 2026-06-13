import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
export const Route = createFileRoute("/settings/artist-info")({ component: () => (
  <SettingsShell title="Artist Info" blurb="Press bio, label, hometown.">
    <Card><div className="py-6 text-center text-sm text-white/50">Coming soon. Manage stage name and bio from the <a className="text-red-400" href="/settings/profile">Profile tab</a> for now.</div></Card>
  </SettingsShell>
)});