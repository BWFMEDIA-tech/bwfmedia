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
      { title: "BWF Media TV" },
      {
        name: "description",
        content:
          "Viral Velocity Deck is a pitch deck template for BWF Media TV to attract investors and media partners.",
      },
      { name: "author", content: "BWF Media TV" },
      { property: "og:title", content: "BWF Media TV" },
      {
        property: "og:description",
        content:
          "Viral Velocity Deck is a pitch deck template for BWF Media TV to attract investors and media partners.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BWF Media TV" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@bwfmediatv" },
      { name: "twitter:title", content: "BWF Media TV" },
      {
        name: "twitter:description",
        content:
          "Viral Velocity Deck is a pitch deck template for BWF Media TV to attract investors and media partners.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ddc10b07-a589-4ecc-a77c-3e9e2883515d/id-preview-8d4f3b74--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1777303921831.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ddc10b07-a589-4ecc-a77c-3e9e2883515d/id-preview-8d4f3b74--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1777303921831.png",
      },
      { name: "description", content: "BWFNETWORK is a production-ready livestream platform for BWF Media TV's viral content." },
      { property: "og:description", content: "BWFNETWORK is a production-ready livestream platform for BWF Media TV's viral content." },
      { name: "twitter:description", content: "BWFNETWORK is a production-ready livestream platform for BWF Media TV's viral content." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2dd29924-3a7b-47ad-b473-ec1294de78a1/id-preview-818080f5--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1779975630971.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2dd29924-3a7b-47ad-b473-ec1294de78a1/id-preview-818080f5--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app-1779975630971.png" },
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
              "@id": "https://bwfmedia.company/#organization",
              name: "BWF Media TV",
              url: "https://bwfmedia.company",
              logo: "https://bwfmedia.company/favicon.png",
              sameAs: ["https://youtube.com/@bwfmedia", "https://instagram.com/bwfmediatv"],
            },
            {
              "@type": "WebSite",
              "@id": "https://bwfmedia.company/#website",
              url: "https://bwfmedia.company",
              name: "BWF Media TV",
              publisher: { "@id": "https://bwfmedia.company/#organization" },
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
  const isChrome = !pathname.startsWith("/stream-studio") && !pathname.startsWith("/stream/");
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <PaymentTestModeBanner />
        {isChrome && <ArtistTrialBanner />}
        {isChrome && <SiteHeader />}
        <div className={isChrome ? "pt-24 md:pt-28" : ""}>
          <Outlet />
        </div>
        {isChrome && <SiteFooter />}
        <CartDrawer />
      </CartProvider>
    </QueryClientProvider>
  );
}
