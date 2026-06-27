import { createFileRoute, Link } from "@tanstack/react-router";
import { getTrendingForSeo, type SeoTrack } from "@/lib/seo-public.functions";
import { SectionHeader, TrackCard } from "@/components/seo/SeoLinks";

const SITE = "https://www.bwfnetwork.com";

export const Route = createFileRoute("/trending")({
  loader: () => getTrendingForSeo(),
  head: () => {
    const title = "Trending Music — Top Tracks Right Now | Tunevio";
    const desc = "The hottest live battle tracks trending on Tunevio. Updated continuously from real fan votes and plays.";
    const url = `${SITE}/trending`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TrendingPage,
});

function TrendingPage() {
  const tracks = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pt-20">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-widest text-white/50">Live now</div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Trending Music</h1>
          <p className="mt-2 text-white/70">The hottest tracks battling on Tunevio.</p>
        </header>
        <section>
          <SectionHeader title="Top tracks" />
          <div className="grid gap-3 sm:grid-cols-2">
            {tracks.map((t: SeoTrack) => <TrackCard key={t.id} track={t} />)}
          </div>
        </section>
        <nav className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link to="/charts" className="text-cyan-300 hover:underline">Charts</Link>
          <Link to="/tunevio" className="text-cyan-300 hover:underline">Tunevio Home</Link>
        </nav>
      </div>
    </main>
  );
}