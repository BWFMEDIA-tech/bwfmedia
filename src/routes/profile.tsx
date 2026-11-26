import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: "/profile" } as any });
    }
    throw redirect({
      to: "/artist/$id",
      params: { id: data.user.id },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Artist Profile — Tunevio" },
      { name: "description", content: "Visit the artist profile on Tunevio." },
      { property: "og:title", content: "Artist Profile — Tunevio" },
      { property: "og:description", content: "Visit the artist profile on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
