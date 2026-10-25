import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingPage } from "@/components/tunevio/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tunevio | Independent Music Streaming & Live Artist Battles" },
      {
        name: "description",
        content:
          "Discover independent music, stream songs and music videos, connect with unsigned artists, join live music events, and compete in real-time artist battles on Tunevio.",
      },
      { property: "og:title", content: "Tunevio | Independent Music Streaming & Live Artist Battles" },
      {
        property: "og:description",
        content:
          "Discover independent music, stream songs and music videos, connect with unsigned artists, join live music events, and compete in real-time artist battles on Tunevio.",
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

  // Signed-in visitors go straight to the app home. Signed-out visitors who
  // already created an account on this device are sent to sign in; the landing
  // page is only for people who have never signed up.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        nav({ to: "/home", replace: true });
        return;
      }
      let hasAccount = false;
      try {
        hasAccount = window.localStorage.getItem("tunevio:has-account") === "1";
      } catch {
        hasAccount = false;
      }
      if (hasAccount) nav({ to: "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return <LandingPage />;
}
