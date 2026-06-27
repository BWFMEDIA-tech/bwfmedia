import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Calendar, Clock, Mic, Video, Flame, TrendingUp, Camera, Music2 } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — BWF Media TV" },
      { name: "description", content: "Read the latest from BWF Media TV, interviews, behind-the-scenes stories, viral content breakdowns, and culture commentary from the heart of hip-hop." },
      { property: "og:title", content: "BWF Media TV Blog, Where Culture Speaks" },
      { property: "og:description", content: "Interviews, BTS, and culture commentary from BWF Media TV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/blog" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "BWF Media TV Blog",
        url: "https://bwfnetwork.com/blog",
        description: "Interviews, BTS, and culture commentary from BWF Media TV.",
        publisher: { "@type": "Organization", name: "BWF Media TV", url: "https://bwfnetwork.com" },
      }),
    }],
  }),
  component: BlogPage,
});

const featured = {
  category: "Interview",
  title: "How a 60-Second Clip Hit 4.2M Views in a Weekend",
  excerpt:
    "We break down the editing rhythm, hook framing, and platform timing behind one of our most viral interview drops of the year.",
  date: "Apr 28, 2026",
  readTime: "6 min read",
  author: "BWF Editorial",
  Icon: Flame,
};

const posts = [
  {
    category: "Interview",
    Icon: Mic,
    title: "The Art of the Cold Open: Why First 3 Seconds Decide Everything",
    excerpt: "Hooks aren't optional. We share the formula our editors use to lock viewers before they swipe.",
    date: "Apr 22, 2026",
    readTime: "5 min read",
  },
  {
    category: "Behind The Scenes",
    Icon: Camera,
    title: "Inside the Studio: A Day Shooting With BWF Media",
    excerpt: "From load-in to wrap, what really happens during a BWF interview shoot.",
    date: "Apr 15, 2026",
    readTime: "4 min read",
  },
  {
    category: "Industry",
    Icon: TrendingUp,
    title: "Why Independent Media Is Eating the Majors' Lunch",
    excerpt: "The shift from press releases to platform-native content, and why artists are coming to us first.",
    date: "Apr 09, 2026",
    readTime: "7 min read",
  },
  {
    category: "Culture",
    Icon: Music2,
    title: "Southern Hip-Hop's Next Wave: 5 Names On Our Radar",
    excerpt: "The artists building real audiences without label backing, and why they matter right now.",
    date: "Apr 02, 2026",
    readTime: "8 min read",
  },
  {
    category: "Music Video",
    Icon: Video,
    title: "Shooting Music Videos That Don't Look Like Everything Else",
    excerpt: "Our directors on lighting, location scouting, and the visual language of street culture.",
    date: "Mar 26, 2026",
    readTime: "6 min read",
  },
  {
    category: "Strategy",
    Icon: Flame,
    title: "The Post-Show Content Engine: Turning One Night Into Weeks of Reach",
    excerpt: "How promoters can extend the life of a single event through layered content drops.",
    date: "Mar 19, 2026",
    readTime: "5 min read",
  },
];

function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-tight text-bone hover:opacity-80">
            BWF<span style={{ color: "var(--blood)" }}>™</span>
          </Link>
          <nav className="flex items-center gap-6 font-cond font-bold tracking-[0.25em] text-[11px] uppercase">
            <Link to="/" className="text-bone/70 hover:text-bone transition-colors">Home</Link>
            <Link to="/blog" className="text-bone">Blog</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-border overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: "var(--blood)" }}
        />
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <span className="block h-px w-10" style={{ backgroundColor: "var(--blood)" }} />
            <span className="font-cond font-bold tracking-[0.4em] text-xs uppercase" style={{ color: "var(--blood)" }}>
              The BWF Journal
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-bone heavy-shadow max-w-4xl">
            STORIES, INTERVIEWS &amp;{" "}
            <span style={{ color: "var(--blood)" }}>CULTURE</span> COMMENTARY.
          </h1>
          <p className="mt-6 text-bone/70 max-w-2xl text-base md:text-lg">
            Long-form perspectives from the BWF Media TV editorial team, viral breakdowns,
            artist conversations, and the strategy behind the content that moves culture.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-6" style={{ color: "var(--blood)" }}>
            ▶ Featured Story
          </div>
          <article
            className="relative grid md:grid-cols-5 gap-8 md:gap-12 p-6 md:p-10 border-2"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "var(--blood)" }} />
            <div
              className="md:col-span-2 aspect-[4/3] flex items-center justify-center border"
              style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(0,0,0,0.6))" }}
            >
              <featured.Icon className="w-20 h-20" style={{ color: "var(--blood)" }} strokeWidth={1.5} />
            </div>
            <div className="md:col-span-3 flex flex-col">
              <div className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone/60 mb-3">
                {featured.category}
              </div>
              <h2 className="font-display text-3xl md:text-5xl leading-[1] text-bone tracking-tight mb-4">
                {featured.title}
              </h2>
              <p className="text-bone/70 text-base md:text-lg leading-relaxed mb-6">{featured.excerpt}</p>
              <div className="mt-auto flex items-center gap-5 text-bone/50 font-cond tracking-[0.2em] text-[11px] uppercase">
                <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{featured.date}</span>
                <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
              </div>
              <button
                className="mt-6 inline-flex items-center gap-2 self-start px-5 py-3 font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--blood)", boxShadow: "var(--shadow-blood)" }}
              >
                Read Story <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Grid */}
      <section>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl md:text-5xl leading-none text-bone heavy-shadow">
              LATEST <span style={{ color: "var(--blood)" }}>POSTS</span>
            </h2>
            <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/50">
              {posts.length} stories
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p, i) => (
              <article
                key={i}
                className="group relative flex flex-col p-6 border-2 cursor-pointer hover:-translate-y-1 transition-transform"
                style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <div className="absolute top-0 left-0 w-full h-1 group-hover:h-1.5 transition-all" style={{ backgroundColor: "var(--blood)" }} />
                <p.Icon className="w-7 h-7 mb-4" style={{ color: "var(--blood)" }} strokeWidth={2.5} />
                <div className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone/60 mb-3">
                  {p.category}
                </div>
                <h3 className="font-display text-xl md:text-2xl text-bone tracking-tight leading-tight mb-3">
                  {p.title}
                </h3>
                <p className="text-bone/65 text-sm leading-relaxed mb-6">{p.excerpt}</p>
                <div className="mt-auto flex items-center justify-between text-bone/45 font-cond tracking-[0.2em] text-[10px] uppercase">
                  <span className="flex items-center gap-2"><Calendar className="w-3 h-3" />{p.date}</span>
                  <span className="flex items-center gap-2"><Clock className="w-3 h-3" />{p.readTime}</span>
                </div>
                <ArrowUpRight
                  className="absolute top-6 right-6 w-5 h-5 text-bone/40 group-hover:text-bone group-hover:rotate-12 transition-all"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="border-t border-border" style={{ backgroundColor: "var(--card)" }}>
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-20 text-center">
          <div className="font-cond font-bold tracking-[0.4em] text-xs uppercase mb-4" style={{ color: "var(--blood)" }}>
            Stay In The Loop
          </div>
          <h2 className="font-display text-3xl md:text-5xl text-bone leading-tight mb-4">
            GET THE NEXT DROP IN YOUR INBOX.
          </h2>
          <p className="text-bone/65 mb-8 max-w-xl mx-auto">
            New interviews, BTS access, and culture commentary, straight to you, no spam.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              required
              aria-label="Email address for newsletter"
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 bg-background border-2 text-bone placeholder:text-bone/40 focus:outline-none focus:border-[var(--blood)]"
              style={{ borderColor: "var(--border)" }}
            />
            <button
              type="submit"
              className="px-6 py-3 font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--blood)", boxShadow: "var(--shadow-blood)" }}
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}