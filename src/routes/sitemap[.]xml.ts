import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { listForSitemap } from "@/lib/seo-public.functions";

const BASE_URL = "https://www.bwfnetwork.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/studio", changefreq: "weekly", priority: "0.9" },
          { path: "/off-the-block", changefreq: "weekly", priority: "0.9" },
          { path: "/videos", changefreq: "weekly", priority: "0.8" },
          { path: "/artists", changefreq: "weekly", priority: "0.8" },
          { path: "/events", changefreq: "weekly", priority: "0.7" },
          { path: "/deck", changefreq: "monthly", priority: "0.5" },
          { path: "/dashboard", changefreq: "monthly", priority: "0.4" },
          { path: "/earnings", changefreq: "monthly", priority: "0.4" },
          { path: "/access-denied", changefreq: "yearly", priority: "0.1" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/blog/how-to-live-stream-music", changefreq: "monthly", priority: "0.7" },
          { path: "/blog/live-stream-music-twitch-youtube-facebook", changefreq: "monthly", priority: "0.6" },
          { path: "/blog/how-artists-get-paid-for-streaming-music", changefreq: "monthly", priority: "0.6" },
          { path: "/blog/can-you-play-music-on-live-stream", changefreq: "monthly", priority: "0.6" },
          { path: "/trending", changefreq: "daily", priority: "0.8" },
          { path: "/charts", changefreq: "daily", priority: "0.8" },
          { path: "/tunevio", changefreq: "weekly", priority: "0.9" },
        ];

        try {
          const { data } = await supabaseAdmin
            .from("videos")
            .select("id, created_at")
            .order("created_at", { ascending: false });
          if (data) {
            for (const v of data) {
              entries.push({
                path: `/videos/${v.id}`,
                lastmod: v.created_at ? new Date(v.created_at).toISOString() : undefined,
                changefreq: "monthly",
                priority: "0.6",
              });
            }
          }
        } catch {
          // ignore — still serve static entries
        }

        try {
          const seo = await listForSitemap();
          for (const a of seo.artists) {
            entries.push({
              path: `/a/${a.slug}`,
              lastmod: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
          for (const t of seo.tracks) {
            entries.push({
              path: `/track/${t.slug}`,
              lastmod: t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
          for (const g of seo.genres) {
            entries.push({
              path: `/genre/${g}`,
              changefreq: "weekly",
              priority: "0.5",
            });
          }
        } catch (e) {
          console.error("[sitemap] seo listing failed", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});