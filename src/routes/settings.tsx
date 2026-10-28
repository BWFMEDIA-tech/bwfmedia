import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GeneralSettingsShell } from "@/components/settings/GeneralSettingsShell";
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

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.history.back();
        else void router.navigate({ to: "/" });
      }}
      className="sticky top-[calc(var(--bwf-banner-h,0px)+80px)] z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-muted hover:text-primary"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function SettingsLayout() {
  return (
    <GeneralSettingsShell>
    <div className="swara-settings min-h-screen bg-background text-foreground pb-24">
        <div className="mx-auto max-w-[1600px] px-0 py-4 md:px-4 md:py-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:gap-8">
            <main className="min-w-0 flex-1">
              <div className="px-4 pt-1 md:px-0">
                <BackButton />
              </div>
              <Outlet />
            </main>
          </div>
        </div>
    </div>
    </GeneralSettingsShell>
  );
}