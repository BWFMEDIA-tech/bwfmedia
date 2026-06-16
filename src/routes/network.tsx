import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "BWF Network | Music Streaming, Live Artist Battles & Monetization Platform" },
      {
        name: "description",
        content:
          "BWF Network is a next-generation music streaming platform for independent artists featuring live streaming, real-time rankings, fan engagement, and artist monetization tools.",
      },
      {
        name: "keywords",
        content:
          "music streaming platform, independent music platform, live music streaming, artist monetization platform, music discovery platform, creator economy platform, live artist battles, earn money from music",
      },
      { property: "og:title", content: "BWF Network | Music Streaming, Live Artist Battles & Monetization Platform" },
      {
        property: "og:description",
        content:
          "Discover, stream, and support independent artists through live music streaming, real-time rankings, and creator monetization tools.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/network" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/network" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is BWF Network?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A live music streaming and monetization platform for independent artists.",
              },
            },
            {
              "@type": "Question",
              name: "How do artists earn money?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Through tips, boosts, subscriptions, and merch sales.",
              },
            },
            {
              "@type": "Question",
              name: "Is it free for listeners?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, with optional premium features.",
              },
            },
            {
              "@type": "Question",
              name: "What is live ranking?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A real-time system that ranks artists based on engagement and boosts.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="py-24 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold">
          Independent Music Streaming & Live Artist Monetization Platform
        </h1>
        <p className="mt-6 text-lg text-gray-300 max-w-3xl mx-auto">
          Discover, stream, and support independent artists through live music streaming,
          real-time rankings, audience voting, and creator monetization tools.
        </p>
        <p className="mt-4 text-gray-400">
          A next-generation music streaming platform built for independent artists,
          live performance battles, and creator economy growth.
        </p>
      </section>

      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold">What is BWF Network?</h2>
        <p className="mt-4 text-gray-300">
          BWF Network is a music streaming and creator economy platform designed for
          independent artists to grow, perform live, and monetize their audience through
          tips, boosts, subscriptions, and merch.
        </p>
      </section>

      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold">
          Live Music Streaming & Creator Economy Platform
        </h2>
        <ul className="mt-6 space-y-4 text-gray-300">
          <li>🎤 Live music streaming and performance battles</li>
          <li>📊 Real-time artist ranking engine</li>
          <li>💰 Artist monetization through tips, boosts & subscriptions</li>
          <li>🔥 Audience engagement and live voting system</li>
          <li>🚀 Independent music discovery platform</li>
        </ul>
      </section>

      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold">Earn Money from Music on BWF Network</h2>
        <p className="mt-4 text-gray-300">
          Artists earn through fan tips, live stream engagement, boost promotion systems,
          subscriptions, and merchandise sales — all tracked in real-time.
        </p>
      </section>

      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold">The Next Generation Music Platform</h2>
        <p className="mt-4 text-gray-300">
          Built as a hybrid of Spotify and Twitch, BWF Network is redefining how artists
          are discovered, ranked, and monetized in the creator economy.
        </p>
      </section>

      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="mt-6 space-y-4 text-gray-300">
          <p>
            <strong>What is BWF Network?</strong> A live music streaming and monetization
            platform for independent artists.
          </p>
          <p>
            <strong>How do artists earn money?</strong> Through tips, boosts,
            subscriptions, and merch sales.
          </p>
          <p>
            <strong>Is it free for listeners?</strong> Yes, with optional premium
            features.
          </p>
          <p>
            <strong>What is live ranking?</strong> A real-time system that ranks artists
            based on engagement and boosts.
          </p>
        </div>
      </section>
    </main>
  );
}