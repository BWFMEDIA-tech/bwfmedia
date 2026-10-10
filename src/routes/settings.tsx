import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    if (location.pathname === "/settings") throw redirect({ to: "/settings/profile" });
  },
  head: () => ({ meta: [{ title: "Settings — BWF Network" }, { name: "description", content: "Manage your BWF Network profile and account." }] }),
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <ArtistDashboardShell>
    <div className="min-h-screen bg-[#050505] text-white pb-24">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-10">
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