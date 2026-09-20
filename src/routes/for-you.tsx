import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getForYou } from "@/lib/listener.functions";
import { useAuth } from "@/lib/auth-context";
import { ContentRail } from "@/components/tunevio/ContentRail";
import { AlbumCard, ArtistCard } from "@/components/tunevio/cards";
import { EmptyState, ListenerPage, RailSkeleton, SignInPrompt } from "@/components/listener/ListenerNav";

export const Route = createFileRoute("/for-you")({
  head: () => ({
    meta: [
      { title: "For You — Tunevio Personalized Music Discovery" },
      {
        name: "description",
        content:
          "Your personal Tunevio mix: made for you, recommended tracks, new releases, hidden gems and rising artists built from what you actually play.",
      },
      { property: "og:title", content: "For You — Tunevio" },
      { property: "og:description", content: "Personalized music discovery built from your listening on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForYouPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-white/70">
      Couldn't load your recommendations: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center text-white/60">Nothing here.</div>,
});

function ForYouPage() {
  const auth = useAuth();
  const fetchForYou = useServerFn(getForYou);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["for-you"],
    queryFn: () => fetchForYou({ data: {} as never }),
    enabled: auth.isAuthenticated,
    staleTime: 60_000,
  });

  if (!auth.loading && !auth.isAuthenticated) {
    return (
      <ListenerPage title="For You" subtitle="Personalized music discovery">
        <SignInPrompt what="For You" />
      </ListenerPage>
    );
  }

  return (
    <ListenerPage title="For You" subtitle="Built from your listening, likes, saves and follows">
      {isLoading ? (
        <RailSkeleton />
      ) : isError ? (
        <EmptyState title="Something went wrong" body="We couldn't build your mix right now. Try again shortly." />
      ) : !data?.hasEnoughActivity ? (
        <div className="space-y-8">
          <EmptyState
            title="Keep listening to unlock your mixes"
            body={`We need a bit more activity before recommendations make sense. Play a few songs, like what you enjoy and follow some artists (${data?.activityCount ?? 0} of 5 signals so far).`}
            action={
              <Link
                to="/charts"
                className="rounded-full bg-tv-cyan px-6 py-2.5 text-sm font-black text-black transition hover:brightness-110"
              >
                Start listening
              </Link>
            }
          />
          <ContentRail
            title="New Releases"
            eyebrow="Fresh on Tunevio"
            items={(data?.newReleases ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={data?.newReleases} />
            ))}
          />
          <ContentRail
            title="Trending Now"
            eyebrow="Heating up"
            items={(data?.trending ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={data?.trending} />
            ))}
          />
        </div>
      ) : (
        <div className="space-y-10">
          {data.topGenres.length ? (
            <div className="flex flex-wrap gap-2">
              {data.topGenres.map((g) => (
                <span key={g} className="rounded-full border border-tv-line px-3 py-1 text-xs font-bold text-white/70">
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          <ContentRail
            title="Continue Listening"
            eyebrow="Pick up where you left off"
            items={data.continueListening.map((t) => (
              <AlbumCard key={t.id} track={t} queue={data.continueListening} />
            ))}
          />
          <ContentRail
            title="Made For You"
            eyebrow="Personalized"
            items={data.madeForYou.map((t) => <AlbumCard key={t.id} track={t} queue={data.madeForYou} />)}
          />
          <ContentRail
            title="Recommended For You"
            eyebrow="Based on your taste"
            items={data.recommended.map((t) => <AlbumCard key={t.id} track={t} queue={data.recommended} />)}
          />
          {data.becauseYouListenedTo ? (
            <ContentRail
              title={`Because You Listened To ${data.becauseYouListenedTo.seedArtist}`}
              eyebrow="Similar sounds"
              items={data.becauseYouListenedTo.tracks.map((t) => (
                <AlbumCard key={t.id} track={t} queue={data.becauseYouListenedTo!.tracks} />
              ))}
            />
          ) : null}
          <ContentRail
            title="New Releases"
            eyebrow="Fresh on Tunevio"
            items={data.newReleases.map((t) => <AlbumCard key={t.id} track={t} queue={data.newReleases} />)}
          />
          <ContentRail
            title="Rising Artists"
            eyebrow="Gaining momentum"
            size="md"
            items={data.risingArtists.map((a) => (
              <ArtistCard
                key={a.id}
                artist={{ id: a.id, name: a.name, avatarUrl: a.avatarUrl, bio: null, genres: [], monthlyListeners: a.plays }}
              />
            ))}
          />
          <ContentRail
            title="Hidden Gems"
            eyebrow="Under the radar"
            items={data.hiddenGems.map((t) => <AlbumCard key={t.id} track={t} queue={data.hiddenGems} />)}
          />
          <ContentRail
            title="Trending Now"
            eyebrow="Heating up"
            items={data.trending.map((t) => <AlbumCard key={t.id} track={t} queue={data.trending} />)}
          />
        </div>
      )}
    </ListenerPage>
  );
}
