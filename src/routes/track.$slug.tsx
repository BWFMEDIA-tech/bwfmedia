import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getTrackForSeo, type SeoTrack } from "@/lib/seo-public.functions";
import { GenreChips, SectionHeader, TrackCard } from "@/components/seo/SeoLinks";

const SITE = "https://www.bwfnetwork.com";

export const Route = createFileRoute("/track/$slug")({
  loader: async ({ params }) => {
    const data = await getTrackForSeo({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const title = loaderData
      ? `${loaderData.track.title} by ${loaderData.track.artistName} | Listen on Tunevio`
      : "Track | Tunevio";
    const desc = loaderData
      ? `Stream "${loaderData.track.title}" by ${loaderData.track.artistName} on Tunevio. Vote in live music battles, discover new artists, and join the community.`
      : "Discover live music battles on Tunevio.";
    const url = `${SITE}/track/${params.slug}`;
    const image = loaderData?.track?.coverUrl || `${SITE}/og-default.jpg`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index, follow" },
        { property: "og:type", content: "music.song" },
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
  component: TrackSeoPage,
});

function TrackSeoPage() {
  const { track, artist, relatedTracks } = Route.useLoaderData();
  const url = `${SITE}/track/${track.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: track.title,
    url,
    image: track.coverUrl || undefined,
    datePublished: track.createdAt,
    byArtist: {
      "@type": "MusicGroup",
      name: track.artistName,
      url: artist ? `${SITE}/a/${artist.slug}` : undefined,
    },
    genre: track.genres,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <article className="flex flex-col gap-6 md:flex-row">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={`${track.title} cover art`}
              className="h-64 w-64 self-center rounded-xl object-cover shadow-2xl md:self-start"
            />
          ) : (
            <div className="grid h-64 w-64 self-center place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-5xl shadow-2xl md:self-start">
              ♪
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs uppercase tracking-widest text-white/50">Song</div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{track.title}</h1>
            <p className="mt-2 text-lg text-white/80">
              by{" "}
              {artist ? (
                <Link to="/a/$slug" params={{ slug: artist.slug }} className="font-semibold text-cyan-300 hover:underline">
                  {artist.name}
                </Link>
              ) : (
                <span>{track.artistName}</span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
              <span>{track.playCount} plays</span>
              <span>{track.likeCount} likes</span>
              <span>Added {new Date(track.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-4"><GenreChips genres={track.genres} /></div>

            <div className="mt-6 flex flex-wrap gap-3">
              {artist ? (
                <Link
                  to="/a/$slug"
                  params={{ slug: artist.slug }}
                  className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-2 font-bold text-black hover:opacity-90"
                >
                  ▶ Listen on Tunevio
                </Link>
              ) : null}
              <Link to="/trending" className="rounded-full border border-white/20 px-5 py-2 hover:border-white/50">
                Trending
              </Link>
            </div>
          </div>
        </article>

        <section className="mt-12">
          <SectionHeader title="Song details" />
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <dt className="text-white/50">Artist</dt>
              <dd className="font-semibold">{track.artistName}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <dt className="text-white/50">Released</dt>
              <dd className="font-semibold">{new Date(track.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>

        {relatedTracks.length ? (
          <section className="mt-12">
            <SectionHeader title="Related Tracks" subtitle={`More from ${track.artistName}`} />
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedTracks.map((t: SeoTrack) => <TrackCard key={t.id} track={t} />)}
            </div>
          </section>
        ) : null}

        <nav className="mt-12 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link to="/trending" className="text-cyan-300 hover:underline">Trending</Link>
          <Link to="/charts" className="text-cyan-300 hover:underline">Charts</Link>
          <Link to="/tunevio" className="text-cyan-300 hover:underline">Tunevio Home</Link>
        </nav>
      </div>
    </main>
  );
}