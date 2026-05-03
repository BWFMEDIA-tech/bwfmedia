import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail, Instagram, Phone, ArrowLeft, MapPin, Check, Mic, Clapperboard,
  Camera, Smartphone, Calendar, Lock, CheckCircle2, User, Users, Plane,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";

const GOLD = "#D4A24C";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "BWF Media Studio — Studio Bookings Only" },
      { name: "description", content: "Premium media production hub for artists & creators. Book studio time at BWF Media for interviews, music video content, podcast recording, and press sessions." },
      { property: "og:title", content: "BWF Media Studio — Where Culture, Content & Creators Meet" },
      { property: "og:description", content: "Premium studio bookings for artists & creators. Professional sound, lighting, and brand-ready delivery." },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  return (
    <div className="min-h-screen w-full bg-black text-bone">
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
        {/* HERO */}
        <section className="pt-6 md:pt-10 pb-14 border-b border-bone/10">
          <div className="font-display leading-[0.85] text-6xl md:text-8xl uppercase">
            <span className="text-bone">BWF</span><span style={{ color: GOLD }}>MEDIA</span>
          </div>
          <div className="mt-3 font-cond tracking-[0.45em] text-xs md:text-sm uppercase text-bone/70">
            Visuals That Move Culture
          </div>

          <h1 className="mt-10 font-display text-bone uppercase leading-[0.9] text-5xl md:text-7xl">
            Studio<br/>Bookings Only
          </h1>
          <div className="mt-5 inline-block px-4 py-2 font-cond font-bold tracking-[0.2em] text-xs uppercase" style={{ background: GOLD, color: "#000" }}>
            A Premium Media Production Hub for Artists & Creators
          </div>
        </section>

        {/* LOCATION CALLOUT */}
        <section className="py-14 border-b border-bone/10">
          <div className="p-7 md:p-9" style={{ border: `1.5px solid ${GOLD}` }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded grid place-items-center" style={{ border: `1.5px solid ${GOLD}` }}>
                <MapPin className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h2 className="font-cond font-bold tracking-[0.15em] text-base md:text-lg uppercase" style={{ color: GOLD }}>
                  All Sessions Are Recorded At BWFMedia Studio
                </h2>
                <p className="mt-2 text-bone/80">We do not operate as a mobile setup for standard bookings.</p>
                <div className="my-5 h-px bg-bone/15" />
                <p className="text-bone/80">Every project is filmed in a controlled studio environment to ensure:</p>
                <ul className="mt-4 space-y-2.5">
                  {["High-quality visuals","Professional sound + lighting","Consistent branding & production value"].map(t => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full grid place-items-center" style={{ border: `1.5px solid ${GOLD}` }}>
                        <Check className="w-3 h-3" style={{ color: GOLD }} />
                      </span>
                      <span className="text-bone/90">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES AVAILABLE */}
        <section className="py-14 border-b border-bone/10">
          <div className="flex items-center gap-4 justify-center">
            <div className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} />
            <h2 className="font-cond font-bold tracking-[0.4em] text-sm md:text-base uppercase" style={{ color: GOLD }}>Services Available</h2>
            <div className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} />
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { icon: Mic,         title: ["Artist","Interviews"] },
              { icon: Clapperboard,title: ["Music Video","Content"] },
              { icon: Mic,         title: ["Podcast","Recording"] },
              { icon: Camera,      title: ["Press +","Media Sessions"] },
              { icon: Smartphone,  title: ["Social Media","Content Packages"] },
            ].map(({ icon: Icon, title }, i) => (
              <div key={i} className="text-center">
                <Icon className="w-9 h-9 mx-auto" style={{ color: GOLD }} />
                <div className="mt-3 font-cond font-bold tracking-[0.15em] text-xs uppercase text-bone/85">
                  {title.map((l, idx) => <div key={idx}>{l}</div>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* THREE-COL DETAILS */}
        <section className="py-14 border-b border-bone/10 grid md:grid-cols-3 gap-6">
          {/* Studio Experience Includes */}
          <div className="p-6" style={{ border: `1.5px solid ${GOLD}` }}>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center" style={{ color: GOLD }}>Studio Experience Includes</h3>
            <ul className="mt-5 space-y-4">
              {[
                { icon: Camera,    text: "Professional filming setup" },
                { icon: Clapperboard, text: "Directed shoot sessions" },
                { icon: Mic,       text: "Content capture & editing options" },
                { icon: CheckCircle2, text: "Brand-ready delivery formats" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" style={{ color: GOLD }} />
                  <span className="text-bone/85 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Crew Size */}
          <div className="p-6" style={{ border: `1.5px solid ${GOLD}` }}>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center" style={{ color: GOLD }}>Crew Size</h3>
            <div className="text-center font-cond tracking-[0.15em] text-[11px] uppercase text-bone/60">(Based on Project)</div>
            <ul className="mt-5 space-y-4">
              {[
                { icon: User,  title: "SOLO PRODUCTION", sub: "1 Person" },
                { icon: Users, title: "DUO PRODUCTION",  sub: "2 People" },
                { icon: Users, title: "FULL CREW (3–4 MEMBERS)", sub: "3–4 People" },
              ].map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <div>
                    <div className="font-cond font-bold tracking-[0.12em] text-xs uppercase text-bone/90">{title}</div>
                    <div className="text-bone/65 text-sm">{sub}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-bone/15 text-bone/70 text-xs text-center">
              Final crew setup is determined by project scope.
            </div>
          </div>

          {/* Travel Bookings */}
          <div className="p-6" style={{ border: `1.5px solid ${GOLD}` }}>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center" style={{ color: GOLD }}>Travel Bookings</h3>
            <div className="text-center font-cond tracking-[0.15em] text-[11px] uppercase text-bone/60">(Optional Upgrade)</div>
            <Plane className="w-7 h-7 mx-auto mt-4" style={{ color: GOLD }} />
            <p className="mt-4 text-bone/85 text-sm text-center">Available only for:</p>
            <ul className="mt-3 space-y-2 text-bone/85 text-sm">
              <li className="flex gap-2"><span style={{ color: GOLD }}>•</span> High-budget productions</li>
              <li className="flex gap-2"><span style={{ color: GOLD }}>•</span> Live events</li>
              <li className="flex gap-2"><span style={{ color: GOLD }}>•</span> Special brand collaborations</li>
            </ul>
            <div className="mt-5 pt-4 border-t border-bone/15 text-bone/70 text-xs text-center">
              Travel is not included in standard studio sessions.
            </div>
          </div>
        </section>

        {/* BOOKING POLICY */}
        <section className="py-14 border-b border-bone/10">
          <div className="flex items-center gap-4 justify-center">
            <div className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} />
            <h2 className="font-cond font-bold tracking-[0.4em] text-sm md:text-base uppercase" style={{ color: GOLD }}>Booking Policy</h2>
            <div className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} />
          </div>

          <div className="mt-8 p-6 grid md:grid-cols-3 gap-6" style={{ border: `1.5px solid ${GOLD}` }}>
            {[
              { icon: Calendar,     title: "Limited Weekly Availability" },
              { icon: Lock,         title: "Deposit Required to Secure Session" },
              { icon: CheckCircle2, title: "All Bookings Confirmed in Advance" },
            ].map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-3 justify-center md:justify-start">
                <Icon className="w-7 h-7 shrink-0" style={{ color: GOLD }} />
                <div className="font-cond font-bold tracking-[0.15em] text-xs uppercase text-bone/90">{title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 border-b border-bone/10">
          <div className="max-w-2xl mx-auto p-8 text-center" style={{ background: GOLD, color: "#000" }}>
            <h2 className="font-brush text-4xl md:text-5xl tracking-wide">BOOK YOUR SESSION</h2>
            <p className="mt-2 text-black/85">Limited weekly availability. Deposit required to secure your session.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:bookbwfmedia@gmail.com?subject=Studio%20Booking%20Request" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors">
                <Calendar className="w-4 h-4" /> Request Booking
              </a>
              <a href="https://instagram.com/bwf.media" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors">
                <Instagram className="w-4 h-4" /> DM Us
              </a>
            </div>
          </div>
        </section>

        {/* CONTACT FOOTER */}
        <section className="pt-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="font-brush text-5xl md:text-6xl">
              <span className="text-bone">BWF</span><span style={{ color: GOLD }}>MEDIA</span>
            </div>
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/70 mt-1">
              Visuals That Move Culture
            </div>
          </div>
          <div className="space-y-3 font-cond tracking-[0.15em] text-sm">
            <div className="flex items-center gap-3 text-bone/85"><MapPin className="w-4 h-4" style={{ color: GOLD }} /> BWFMedia Studio (Location Provided After Booking)</div>
            <a href="https://instagram.com/bwf.media" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Instagram className="w-4 h-4" style={{ color: GOLD }} /> @bwf.media</a>
            <a href="mailto:bookbwfmedia@gmail.com" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Mail className="w-4 h-4" style={{ color: GOLD }} /> bookbwfmedia@gmail.com</a>
            <a href="tel:+14703336136" className="flex items-center gap-3 text-bone/85 hover:text-bone"><Phone className="w-4 h-4" style={{ color: GOLD }} /> (470) 333-6136</a>
          </div>
        </section>

        <div className="mt-14 pt-8 border-t border-bone/10 font-brush text-3xl md:text-4xl tracking-wide text-center uppercase">
          Where <span style={{ color: GOLD }}>Culture, Content,</span><br/>
          and <span style={{ color: GOLD }}>Creators</span> <span className="italic">Meet.</span>
        </div>
      </main>
    </div>
  );
}
