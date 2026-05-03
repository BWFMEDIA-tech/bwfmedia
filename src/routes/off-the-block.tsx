import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail, Instagram, Phone, ArrowLeft, Mic, Camera, Globe, PlayCircle,
  Check, Users, Tv, Youtube,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";

const GOLD = "#D4A24C";

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
    <div className="min-h-screen w-full bg-black text-bone">
      {/* Site header */}
      <header className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-12 h-12 object-contain" />
          <span className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70">BWF Media</span>
        </Link>
        <Link to="/" className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors inline-flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 pb-20">
        {/* HERO — flyer-style title block */}
        <section className="pt-6 md:pt-10 pb-14 border-b border-bone/10">
          <div className="font-cond tracking-[0.4em] text-[11px] uppercase text-bone/60">
            BWF Media <span style={{ color: GOLD }}>presents</span>
          </div>

          <h1 className="mt-6 font-brush leading-[0.85] text-7xl md:text-[9rem] uppercase">
            <span className="block text-bone">BWF</span>
            <span className="block text-bone">OFF THE</span>
            <span className="block" style={{ color: GOLD }}>BLOCK</span>
          </h1>

          <div className="mt-6 inline-block bg-bone text-black px-5 py-2 font-cond font-bold tracking-[0.2em] text-xs md:text-sm uppercase italic">
            The Streets. The People. The Real.
          </div>

          <p className="mt-8 max-w-2xl text-bone/80 text-base md:text-lg leading-relaxed">
            BWF Off The Block is our on-location street interview platform where we tap in
            with the culture, the community, and the voices that never get overlooked.
          </p>
        </section>

        {/* PILLARS + WHAT WE COVER */}
        <section className="grid md:grid-cols-2 gap-10 md:gap-14 py-14 border-b border-bone/10">
          <ul className="space-y-7">
            {[
              { icon: Mic,        title: "REAL CONVERSATIONS", desc: "Raw & uncut interviews from the block to the world." },
              { icon: Camera,     title: "ON LOCATION",        desc: "We pull up where the culture happens." },
              { icon: Globe,      title: "REAL STORIES",       desc: "Artists, entrepreneurs, influencers & everyday people making moves." },
              { icon: PlayCircle, title: "CONTENT THAT HITS",  desc: "High-quality videos designed for YouTube, Instagram, TikTok & more." },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-5">
                <div
                  className="shrink-0 w-12 h-12 rounded-full grid place-items-center"
                  style={{ border: `1.5px solid ${GOLD}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <div className="font-cond font-bold tracking-[0.18em] text-sm uppercase" style={{ color: GOLD }}>{title}</div>
                  <p className="mt-1 text-bone/80 text-sm md:text-base">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* What We Cover card */}
          <div className="self-start p-7 md:p-8" style={{ border: `1.5px dashed ${GOLD}` }}>
            <h2 className="font-brush text-3xl md:text-4xl tracking-wide italic" style={{ color: GOLD }}>
              What We Cover
            </h2>
            <ul className="mt-5 space-y-3 font-cond tracking-[0.12em] text-sm md:text-base uppercase">
              {["Artist Interviews","Street Talk","Upcoming Events","Local Businesses","Community Voices","& More"].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full grid place-items-center" style={{ border: `1.5px solid ${GOLD}` }}>
                    <Check className="w-3 h-3" style={{ color: GOLD }} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* WHY IT MATTERS */}
        <section className="py-14 border-b border-bone/10 text-center">
          <h2 className="font-brush text-4xl md:text-5xl tracking-wide italic" style={{ color: GOLD }}>
            Why It Matters
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-bone/85 text-base md:text-lg">
            We shine a light on real stories, real people, and real situations. BWF Off The Block
            gives a voice to the culture and keeps it authentic.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Users,   label: "FOR THE CULTURE" },
              { icon: Camera,  label: "FOR THE COMMUNITY" },
              { icon: Tv,      label: "FOR THE WORLD" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="p-5" style={{ border: `1.5px solid ${GOLD}` }}>
                <Icon className="w-8 h-8 mx-auto" style={{ color: GOLD }} />
                <div className="mt-3 font-cond font-bold tracking-[0.18em] text-[11px] uppercase text-bone/85">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* BOOK CTA — gold brush block */}
        <section className="py-14 border-b border-bone/10">
          <div className="max-w-2xl mx-auto p-8 text-center" style={{ background: GOLD, color: "#000" }}>
            <h2 className="font-brush text-4xl md:text-5xl tracking-wide">BOOK AN INTERVIEW</h2>
            <p className="mt-2 text-black/85">
              Want us to pull up to your block, event, or location? Let's tap in.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:bookbwfmedia@gmail.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors">
                <Mail className="w-4 h-4" /> Email Us
              </a>
              <a href="https://instagram.com/bwf.media" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors">
                <Instagram className="w-4 h-4" /> DM Us
              </a>
            </div>
            <div className="mt-5 font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-black/80">
              Serious Inquiries Only
            </div>
          </div>
        </section>

        {/* POWERED BY + CONTACT */}
        <section className="pt-12 grid md:grid-cols-2 gap-10 items-center">
          <div className="p-7" style={{ border: `1.5px solid ${GOLD}` }}>
            <div className="font-cond tracking-[0.35em] text-[11px] uppercase text-bone/70 text-center">Powered By</div>
            <div className="mt-2 text-center font-brush text-5xl md:text-6xl">
              <span className="text-bone">BWF</span><span style={{ color: GOLD }}>MEDIA</span>
            </div>
            <div className="mt-1 text-center font-cond tracking-[0.3em] text-[10px] uppercase text-bone/70">
              Visuals That Move Culture
            </div>
          </div>

          <div className="space-y-3 font-cond tracking-[0.18em] text-sm uppercase">
            <a href="https://instagram.com/bwf.media" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Instagram className="w-4 h-4" style={{ color: GOLD }} /> @bwf.media</a>
            <a href="https://youtube.com/@bwfmedia" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Youtube className="w-4 h-4" style={{ color: GOLD }} /> BWF Media</a>
            <a href="mailto:bookbwfmedia@gmail.com" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Mail className="w-4 h-4" style={{ color: GOLD }} /> bookbwfmedia@gmail.com</a>
            <a href="tel:+14703336136" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Phone className="w-4 h-4" style={{ color: GOLD }} /> (470) 333-6136</a>
          </div>
        </section>

        <div className="mt-14 pt-8 border-t border-bone/10 font-brush text-2xl md:text-3xl tracking-wide italic text-center">
          <span className="text-bone">We don't just interview people, </span>
          <span style={{ color: GOLD }}>we tell real stories.</span>
        </div>
      </main>
    </div>
  );
}
