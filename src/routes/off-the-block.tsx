import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic, Camera, Globe, Play, MapPin, Users, Tv, Mail, Instagram, Youtube, Phone, ArrowUpRight, CheckCircle2,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import grunge from "@/assets/grunge-bg.jpg";

const GOLD = "#D4A24C";
const GOLD_SOFT = "#E8C078";

export const Route = createFileRoute("/off-the-block")({
  head: () => ({
    meta: [
      { title: "BWF Off The Block — Street Interviews & Real Conversations" },
      { name: "description", content: "BWF Off The Block: on-location street interviews where culture, community, and real voices meet. Book a pull-up shoot with BWF Media." },
      { property: "og:title", content: "BWF Off The Block — The Streets. The People. The Real." },
      { property: "og:description", content: "Raw, on-location interviews from the block to the world. Tap in with BWF Media." },
    ],
  }),
  component: OffTheBlockPage,
});

function OffTheBlockPage() {
  return (
    <div
      className="min-h-screen w-full text-bone relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.92), rgba(0,0,0,0.96)), url(${grunge})`,
        backgroundSize: "cover",
      }}
    >
      {/* Top bar */}
      <header className="relative z-30 max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 object-contain" />
        </Link>
        <Link
          to="/"
          className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors inline-flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        {/* HERO */}
        <section className="grid md:grid-cols-12 gap-10 items-start pt-6 md:pt-10">
          <div className="md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <img src={bwfLogo} alt="" className="w-12 h-12 object-contain" />
              <div>
                <div className="font-display text-2xl tracking-[0.05em]">
                  BWF <span style={{ color: GOLD }}>MEDIA</span>
                </div>
                <div className="font-cond tracking-[0.4em] text-[10px] uppercase text-bone/60">
                  Visuals That Move Culture
                </div>
              </div>
            </div>
            <div className="font-cond font-bold tracking-[0.5em] text-[11px] uppercase mb-4" style={{ color: GOLD }}>
              Presents
            </div>
            <h1 className="font-brush leading-[0.85] tracking-[0.02em] text-bone heavy-shadow">
              <span className="block text-[22vw] md:text-[10rem]">BWF</span>
              <span className="block text-[22vw] md:text-[10rem]">OFF THE</span>
              <span className="block text-[22vw] md:text-[10rem]" style={{ color: GOLD }}>BLOCK</span>
            </h1>
            <div
              className="mt-6 inline-block px-5 py-2 font-cond italic font-bold tracking-[0.15em] text-sm md:text-base uppercase"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", borderLeft: `3px solid ${GOLD}` }}
            >
              The Streets. The People. The Real.
            </div>
          </div>

          {/* WHAT WE COVER */}
          <aside
            className="md:col-span-5 p-6 md:p-8 mt-4 md:mt-20 backdrop-blur"
            style={{ border: `2px dashed ${GOLD}`, backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <h2 className="font-brush italic text-3xl md:text-4xl mb-5 tracking-wide" style={{ color: GOLD }}>
              What We Cover
            </h2>
            <ul className="space-y-3 font-cond font-semibold tracking-[0.15em] text-sm uppercase text-bone/90">
              {[
                "Artist Interviews",
                "Street Talk",
                "Upcoming Events",
                "Local Businesses",
                "Community Voices",
                "& More",
              ].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: GOLD }} />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        {/* INTRO + ICON ROW */}
        <section className="grid md:grid-cols-12 gap-10 mt-16 md:mt-24">
          <div className="md:col-span-7">
            <p className="text-bone/85 text-base md:text-lg leading-relaxed max-w-xl">
              BWF Off The Block is our on-location street interview platform where we tap in
              with the culture, the community, and the voices that never get overlooked.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {[
                { icon: Mic, title: "Real Conversations", body: "Raw & uncut interviews from the block to the world." },
                { icon: Camera, title: "On Location", body: "We pull up where the culture happens." },
                { icon: Globe, title: "Real Stories", body: "Artists, entrepreneurs, influencers, & everyday people making moves." },
                { icon: Play, title: "Content That Hits", body: "High-quality videos for YouTube, Instagram, TikTok & more." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div
                    className="shrink-0 w-12 h-12 rounded-full grid place-items-center"
                    style={{ border: `2px solid ${GOLD}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <div className="font-cond font-bold tracking-[0.18em] text-sm uppercase" style={{ color: GOLD }}>
                      {title}
                    </div>
                    <p className="text-bone/75 text-sm mt-1 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WHY IT MATTERS */}
          <div className="md:col-span-5 flex flex-col gap-8">
            <div>
              <h2 className="font-brush italic text-4xl md:text-5xl tracking-wide text-center md:text-left" style={{ color: GOLD }}>
                Why It Matters
              </h2>
              <p className="mt-4 text-bone/85 leading-relaxed text-center md:text-left">
                We shine a light on real stories, real people, and real situations. BWF Off The Block
                gives a voice to the culture and keeps it authentic.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Users, label: "For The Culture" },
                { icon: Camera, label: "For The Community" },
                { icon: Tv, label: "For The World" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="p-4 text-center"
                  style={{ border: `1px solid ${GOLD}55` }}
                >
                  <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: GOLD }} />
                  <div className="font-cond font-bold tracking-[0.12em] text-[10px] uppercase text-bone/85 leading-tight">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Powered by */}
            <div className="p-6 text-center" style={{ border: `2px solid ${GOLD}` }}>
              <div className="font-cond tracking-[0.4em] text-[10px] uppercase text-bone/70">Powered By</div>
              <div className="font-display text-3xl mt-1">
                BWF <span style={{ color: GOLD }}>MEDIA</span>
              </div>
              <div className="font-cond tracking-[0.3em] text-[9px] uppercase text-bone/60 mt-1">
                Visuals That Move Culture
              </div>
            </div>
          </div>
        </section>

        {/* BOOK AN INTERVIEW */}
        <section
          className="mt-16 md:mt-24 p-8 md:p-12 grid md:grid-cols-12 gap-8 items-center"
          style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_SOFT} 100%)`, color: "#000" }}
        >
          <div className="md:col-span-7">
            <div className="font-brush text-4xl md:text-5xl tracking-wide">BOOK AN INTERVIEW</div>
            <p className="mt-2 text-black/80 max-w-md">
              Want us to pull up to your block, event, or location? Let's tap in. Serious inquiries only.
            </p>
          </div>
          <div className="md:col-span-5 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:bookbwfmedia@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Mail className="w-4 h-4" /> Email Us
            </a>
            <a
              href="https://instagram.com/bwf.media"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Instagram className="w-4 h-4" /> DM Us
            </a>
          </div>
        </section>

        {/* FOOTER STRIP */}
        <footer className="mt-12 grid md:grid-cols-2 gap-8 items-end pt-8 border-t border-border">
          <div className="space-y-2 font-cond tracking-[0.15em] text-sm text-bone/80">
            <div className="flex items-center gap-3"><Instagram className="w-4 h-4" style={{ color: GOLD }} /> @bwf.media</div>
            <div className="flex items-center gap-3"><Youtube className="w-4 h-4" style={{ color: GOLD }} /> BWF Media</div>
            <div className="flex items-center gap-3"><Mail className="w-4 h-4" style={{ color: GOLD }} /> bookbwfmedia@gmail.com</div>
            <div className="flex items-center gap-3"><Phone className="w-4 h-4" style={{ color: GOLD }} /> (470) 333-6136</div>
          </div>
          <div className="md:text-right">
            <div className="font-brush italic text-2xl md:text-3xl leading-tight">
              We don't just interview people,<br />
              <span style={{ color: GOLD }}>we tell real stories.</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
