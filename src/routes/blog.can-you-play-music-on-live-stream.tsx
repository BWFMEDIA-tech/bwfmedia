import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogArticle } from "@/components/blog/BlogArticle";

const URL = "https://tunevio.com/blog/can-you-play-music-on-live-stream";
const TITLE = "Can You Play Music on a Live Stream? Copyright & DMCA, Explained";
const DESC = "A plain-English guide to playing music on live streams in 2026 — what's allowed, what triggers DMCA strikes, and how to avoid getting your channel banned.";

export const Route = createFileRoute("/blog/can-you-play-music-on-live-stream")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: TITLE,
        description: DESC,
        url: URL,
        author: { "@type": "Organization", name: "Tunevio" },
        publisher: { "@type": "Organization", name: "Tunevio" },
      }),
    }],
  }),
  component: Page,
});

function Page() {
  return (
    <BlogArticle
      category="Guide · Copyright"
      title="Can You Play Music on a Live Stream?"
      date="Jun 27, 2026"
      readTime="6 min read"
      intro="Short answer: only if you own it, licensed it, or you're streaming inside a platform that has cleared the rights. Long answer below — including the DMCA rules that get streams killed."
    >
      <h2>What counts as copyrighted music</h2>
      <p>Every commercially released song has two copyrights: the composition (publisher/songwriter) and the recording (label/artist). Playing a track on a live stream uses both. A Spotify subscription does not grant you broadcast rights — it's for personal listening only.</p>

      <h2>What's actually safe to play live</h2>
      <ul>
        <li>Music you wrote and recorded yourself.</li>
        <li>Royalty-free libraries (Epidemic Sound, Artlist, YouTube Audio Library).</li>
        <li>Twitch Soundtrack (live only — strips from VODs).</li>
        <li>Music inside a platform that has cleared live performance rights.</li>
      </ul>

      <h2>What gets you DMCA-struck</h2>
      <ul>
        <li>Top-40 in the background of your stream.</li>
        <li>Reaction streams to music videos with audio on.</li>
        <li>"Cover" performances without a sync license.</li>
        <li>DJ sets on platforms that don't have a DJ-set carve-out.</li>
      </ul>
      <p>Three DMCA strikes on most platforms ends the channel. Twitch will issue a permanent suspension; YouTube terminates after the third community-guidelines strike.</p>

      <h2>Platform-by-platform rules</h2>
      <p>The exact policies for Twitch, YouTube Live, and Facebook Live differ in important ways. We break each down in <Link to="/blog/live-stream-music-twitch-youtube-facebook">Live streaming music on Twitch, YouTube & Facebook</Link>.</p>

      <h2>The artist workaround</h2>
      <p>If you're a musician, the cleanest path is to stream <em>your own</em> music on a platform built for it. <Link to="/tunevio">Tunevio</Link> is designed for live music — artist battles, fan voting, and audio tools that don't depend on Content ID dodging.</p>

      <h2>If you're hit with a strike</h2>
      <ol>
        <li>Don't ignore it. Each platform's appeals window is short (usually 7–14 days).</li>
        <li>Document ownership: split sheets, distribution receipts, license PDFs.</li>
        <li>File the counter-notice through the platform's official tool, not by email.</li>
      </ol>

      <p>Going live for the first time? Start with <Link to="/blog/how-to-live-stream-music">How to live stream music</Link>.</p>
    </BlogArticle>
  );
}