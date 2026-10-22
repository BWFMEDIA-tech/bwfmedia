import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });

  },
  head: () => ({ meta: [{ title: "Settings — Tunevio" }, { name: "description", content: "Manage your Tunevio profile and account." }, { property: "og:title", content: "Settings — Tunevio" }, { property: "og:description", content: "Manage your Tunevio account preferences and tools." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <ArtistDashboardShell>
    <div className="swara-settings min-h-screen bg-background text-foreground pb-24">
        <div className="mx-auto max-w-[1600px] px-0 py-4 md:px-4 md:py-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:gap-8">
            <main className="min-w-0 flex-1">
              <Outlet />
            </main>
          </div>
        </div>
    </div>
    </ArtistDashboardShell>
  );
}