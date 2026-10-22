import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingPage } from "@/components/tunevio/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio | Discover Independent Music, Live Events & Artist Battles" },
      {
        name: "description",
        content:
          "Discover independent artists, stream music, join interactive live sessions, and experience music battles on Tunevio.",
      },
      { property: "og:title", content: "Tunevio | Discover Independent Music, Live Events & Artist Battles" },
      {
        property: "og:description",
        content:
          "Discover independent artists, stream music, join interactive live sessions, and experience music battles on Tunevio.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/" }],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();

  // Signed-in visitors go straight to the app home; the landing page is for
  // guests deciding whether to join.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) nav({ to: "/home", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return <LandingPage />;
}
