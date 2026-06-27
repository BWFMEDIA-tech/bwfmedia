import { createFileRoute, Link } from "@tanstack/react-router";
import { getChartsForSeo, type SeoArtist, type SeoTrack } from "@/lib/seo-public.functions";
import { ArtistCard, SectionHeader, TrackCard } from "@/components/seo/SeoLinks";

const SITE = "https://www.bwfnetwork.com";

export const Route = createFileRoute("/charts")({
  loader: () => getChartsForSeo(),
  head: () => {
    const title = "Tunevio Charts — Most Played Songs & Top Artists";
    const desc = "The official Tunevio charts of the most played songs and most popular artists right now.";
    const url = `${SITE}/charts`;
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
  component: ChartsPage,
});

function ChartsPage() {
  const { tracks, artists } = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pt-20">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-widest text-white/50">Tunevio</div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Charts</h1>
          <p className="mt-2 text-white/70">Most played songs and most popular artists.</p>
        </header>
        <section className="mb-10">
          <SectionHeader title="Top 100 Songs" />
          <div className="grid gap-3 sm:grid-cols-2">
            {tracks.map((t: SeoTrack) => <TrackCard key={t.id} track={t} />)}
          </div>
        </section>
        {artists.length ? (
          <section className="mb-10">
            <SectionHeader title="Top Artists" />
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {artists.map((a: SeoArtist) => <ArtistCard key={a.id} artist={a} />)}
            </div>
          </section>
        ) : null}
        <nav className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link to="/trending" className="text-cyan-300 hover:underline">Trending</Link>
          <Link to="/tunevio" className="text-cyan-300 hover:underline">Tunevio Home</Link>
        </nav>
      </div>
    </main>
  );
}