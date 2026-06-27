import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getArtistForSeo } from "@/lib/seo-public.functions";
import { ArtistCard, GenreChips, SectionHeader, TrackCard } from "@/components/seo/SeoLinks";

const SITE = "https://www.bwfnetwork.com";

export const Route = createFileRoute("/a/$slug")({
  loader: async ({ params }) => {
    const data = await getArtistForSeo({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.artist?.name || "Artist";
    const title = `${name} Songs, Music & Profile | Tunevio`;
    const desc =
      loaderData?.artist?.bio?.slice(0, 155) ||
      `Listen to ${name}'s songs, latest releases, and trending tracks on Tunevio — the live music battle platform.`;
    const url = `${SITE}/a/${params.slug}`;
    const image = loaderData?.artist?.bannerUrl || loaderData?.artist?.avatarUrl || `${SITE}/og-default.jpg`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index, follow" },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ArtistSeoPage,
});

function ArtistSeoPage() {
  const { artist, topTracks, latestTracks, relatedArtists } = Route.useLoaderData();
  const url = `${SITE}/a/${artist.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url,
    image: artist.avatarUrl || undefined,
    description: artist.bio || undefined,
    genre: artist.genres,
    sameAs: [],
    track: topTracks.slice(0, 10).map((t) => ({
      "@type": "MusicRecording",
      name: t.title,
      url: `${SITE}/track/${t.slug}`,
      byArtist: { "@type": "MusicGroup", name: artist.name },
    })),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {artist.bannerUrl ? (
        <div className="relative h-48 w-full overflow-hidden md:h-72">
          <img src={artist.bannerUrl} alt={`${artist.name} banner`} className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-end">
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt={`${artist.name} portrait`} className="h-28 w-28 rounded-full border-2 border-white/20 object-cover" />
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-3xl font-bold">
              {artist.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{artist.name}</h1>
            {artist.bio ? <p className="mt-2 max-w-2xl text-white/70">{artist.bio}</p> : null}
            <div className="mt-3"><GenreChips genres={artist.genres} /></div>
          </div>
        </header>

        {topTracks.length ? (
          <section className="mb-10">
            <SectionHeader title="Top Songs" subtitle="Most loved tracks by fans" />
            <div className="grid gap-3 sm:grid-cols-2">
              {topTracks.map((t) => <TrackCard key={t.id} track={t} />)}
            </div>
          </section>
        ) : null}

        {latestTracks.length ? (
          <section className="mb-10">
            <SectionHeader title="Latest Releases" subtitle="Recently added" />
            <div className="grid gap-3 sm:grid-cols-2">
              {latestTracks.map((t) => <TrackCard key={t.id} track={t} />)}
            </div>
          </section>
        ) : null}

        {relatedArtists.length ? (
          <section className="mb-10">
            <SectionHeader title="Related Artists" subtitle="Similar genres on Tunevio" />
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {relatedArtists.map((a) => <ArtistCard key={a.id} artist={a} />)}
            </div>
          </section>
        ) : null}

        <nav className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link to="/trending" className="text-cyan-300 hover:underline">Trending Tracks</Link>
          <Link to="/charts" className="text-cyan-300 hover:underline">Charts</Link>
          <Link to="/tunevio" className="text-cyan-300 hover:underline">About Tunevio</Link>
        </nav>
      </div>
    </main>
  );
}