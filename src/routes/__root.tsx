import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import appCss from "../styles.css?url";
import { CartProvider } from "@/contexts/CartContext";
import { CartButton, CartDrawer } from "@/components/CartDrawer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ArtistTrialBanner } from "@/components/artist/TrialBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RealtimeHealthBanner } from "@/components/RealtimeHealthBanner";
import { PlayerProvider } from "@/lib/player-context";
import { GlobalPlayer } from "@/components/player/GlobalPlayer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BWF Network — Music, Live Streams, and Creator Platform" },
      { name: "description", content: "BWF Network is the creator-powered entertainment platform for independent artists: stream music, host live audio and video, sell merch, and grow your fanbase." },
      { name: "author", content: "BWF Media TV" },
      { property: "og:title", content: "BWF Network — Music, Live Streams, and Creator Platform" },
      { property: "og:description", content: "Stream music, go live, and monetize your audience on BWF Network — the creator-powered entertainment platform from BWF Media TV." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BWF Media TV" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@bwfmediatv" },
      { name: "twitter:title", content: "BWF Network — Music, Live Streams, and Creator Platform" },
      { name: "twitter:description", content: "Stream music, go live, and monetize your audience on BWF Network." },
      {
        property: "og:image",
        content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2dd29924-3a7b-47ad-b473-ec1294de78a1/id-preview-818080f5--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1779975630971.png",
      },
      {
        name: "twitter:image",
        content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2dd29924-3a7b-47ad-b473-ec1294de78a1/id-preview-818080f5--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1779975630971.png",
      },
    ],
    scripts: [
      {
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1448122316522268');fbq('track','PageView');`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://bwfnetwork.com/#organization",
              name: "BWF Media TV",
              url: "https://bwfnetwork.com",
              logo: "https://bwfnetwork.com/favicon.png",
              sameAs: ["https://youtube.com/@bwfmedia", "https://instagram.com/bwfmediatv"],
            },
            {
              "@type": "WebSite",
              "@id": "https://bwfnetwork.com/#website",
              url: "https://bwfnetwork.com",
              name: "BWF Media TV",
              publisher: { "@id": "https://bwfnetwork.com/#organization" },
            },
          ],
        }),
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1448122316522268&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChrome = !pathname.startsWith("/stream-studio") && !pathname.startsWith("/stream/") && !pathname.startsWith("/stage/") && !pathname.startsWith("/videos");
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
        <QueryClientProvider client={queryClient}>
      <CartProvider>
        <PlayerProvider>
        {isChrome && <PaymentTestModeBanner />}
        <RealtimeHealthBanner />
        {isChrome && <ArtistTrialBanner />}
        {isChrome && <SiteHeader />}
        <div
          className={isChrome ? "pt-24 md:pt-28" : ""}
          style={isChrome ? { paddingTop: "calc(var(--bwf-banner-h, 0px) + 6rem)" } : undefined}
        >
          <Outlet />
        </div>
        {isChrome && <SiteFooter />}
        <CartDrawer />
        <GlobalPlayer />
        </PlayerProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
