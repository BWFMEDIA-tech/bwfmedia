import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin, CheckCircle2, Mic, Film, Camera, Smartphone, Newspaper, User, Users, UsersRound, Plane, Calendar, Lock, BadgeCheck, Mail, Instagram, Phone,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import grunge from "@/assets/grunge-bg.jpg";

const GOLD = "#D4A24C";
const GOLD_SOFT = "#E8C078";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "BWF Media Studio Bookings — Premium Production Hub" },
      { name: "description", content: "Book the BWFMedia Studio: artist interviews, music videos, podcast recording, press sessions, and social media content packages. Premium media production for artists and creators." },
      { property: "og:title", content: "BWF Media Studio — Where Culture, Content, and Creators Meet" },
      { property: "og:description", content: "Premium studio bookings for artists & creators. Pro filming, sound, lighting, and brand-ready delivery." },
    ],
  }),
  component: StudioPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-6 ${className}`}
      style={{ border: `1px solid ${GOLD}`, backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      {children}
    </div>
  );
}

function StudioPage() {
  return (
    <div
      className="min-h-screen w-full text-bone relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.92), rgba(0,0,0,0.96)), url(${grunge})`,
        backgroundSize: "cover",
      }}
    >
      <header className="relative z-30 max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 object-contain" />
        </Link>
        <Link
          to="/"
          className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
        >
          ← Back to Home
        </Link>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        {/* HERO */}
        <section className="pt-6 md:pt-10">
          <div className="flex items-center gap-3 mb-6">
            <img src={bwfLogo} alt="" className="w-12 h-12 object-contain" />
            <div className="font-cond tracking-[0.4em] text-[10px] uppercase text-bone/60">
              Visuals That Move Culture
            </div>
          </div>
          <h1 className="font-display leading-[0.85] tracking-tight">
            <span className="block text-[16vw] md:text-[8rem]">
              BWF<span style={{ color: GOLD }}>MEDIA</span>
            </span>
            <span className="block text-[14vw] md:text-[7rem] mt-2">STUDIO</span>
            <span className="block text-[14vw] md:text-[7rem]">BOOKINGS ONLY</span>
          </h1>
          <div
            className="mt-6 inline-block px-5 py-2 font-cond font-bold tracking-[0.18em] text-sm uppercase"
            style={{ backgroundColor: GOLD, color: "#000" }}
          >
            A Premium Media Production Hub for Artists & Creators
          </div>
        </section>

        {/* LOCATION CARD */}
        <section className="mt-12">
          <Card>
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div className="shrink-0 w-14 h-14 grid place-items-center" style={{ border: `1px solid ${GOLD}` }}>
                <MapPin className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <div className="flex-1">
                <h2 className="font-cond font-bold tracking-[0.18em] text-lg uppercase" style={{ color: GOLD }}>
                  All Sessions Are Recorded At BWFMedia Studio
                </h2>
                <p className="mt-2 text-bone/80">
                  We do not operate as a mobile setup for standard bookings.
                </p>
                <div className="my-4 h-px bg-border" />
                <p className="text-bone/80">
                  Every project is filmed in a controlled studio environment to ensure:
                </p>
                <ul className="mt-4 space-y-2 text-bone/90">
                  {[
                    "High-quality visuals",
                    "Professional sound + lighting",
                    "Consistent branding & production value",
                  ].map((i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5" style={{ color: GOLD }} />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* SERVICES AVAILABLE */}
        <section className="mt-16">
          <div className="text-center font-cond font-bold tracking-[0.5em] text-xs uppercase mb-8" style={{ color: GOLD }}>
            ── Services Available ──
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { icon: Mic, label: "Artist Interviews" },
              { icon: Film, label: "Music Video Content" },
              { icon: Mic, label: "Podcast Recording" },
              { icon: Camera, label: "Press + Media Sessions" },
              { icon: Smartphone, label: "Social Media Content Packages" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="text-center">
                <Icon className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
                <div className="font-cond font-bold tracking-[0.15em] text-[11px] uppercase text-bone/90 leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* THREE COLUMN INFO */}
        <section className="mt-16 grid md:grid-cols-3 gap-6">
          <Card>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center mb-5" style={{ color: GOLD }}>
              Studio Experience Includes
            </h3>
            <ul className="space-y-3 text-bone/85 text-sm">
              {[
                { icon: Camera, text: "Professional filming setup" },
                { icon: Film, text: "Directed shoot sessions" },
                { icon: Smartphone, text: "Content capture & editing options" },
                { icon: Newspaper, text: "Brand-ready delivery formats" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center" style={{ color: GOLD }}>
              Crew Size
            </h3>
            <div className="text-center font-cond text-[10px] tracking-[0.3em] uppercase text-bone/60 mb-5">
              (Based on Project)
            </div>
            <ul className="space-y-4 text-bone/85 text-sm">
              {[
                { icon: User, title: "Solo Production", sub: "1 Person" },
                { icon: Users, title: "Duo Production", sub: "2 People" },
                { icon: UsersRound, title: "Full Crew (3–4 Members)", sub: "3–4 People" },
              ].map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
                  <div>
                    <div className="font-bold">{title}</div>
                    <div className="text-bone/60 text-xs">{sub}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-bone/60 text-xs italic">
              Final crew setup is determined by project scope.
            </p>
          </Card>

          <Card>
            <h3 className="font-cond font-bold tracking-[0.18em] text-sm uppercase text-center" style={{ color: GOLD }}>
              Travel Bookings
            </h3>
            <div className="text-center font-cond text-[10px] tracking-[0.3em] uppercase text-bone/60 mb-5">
              (Optional Upgrade)
            </div>
            <div className="flex items-start gap-3">
              <Plane className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
              <div className="text-bone/85 text-sm">
                <div className="font-bold mb-2">Available only for:</div>
                <ul className="space-y-1 list-disc list-inside text-bone/80">
                  <li>High-budget productions</li>
                  <li>Live events</li>
                  <li>Special brand collaborations</li>
                </ul>
              </div>
            </div>
            <div className="my-5 h-px bg-border" />
            <p className="text-center text-bone/65 text-xs italic">
              Travel is not included in standard studio sessions.
            </p>
          </Card>
        </section>

        {/* BOOKING POLICY */}
        <section className="mt-12 p-6" style={{ border: `1px solid ${GOLD}` }}>
          <div className="text-center font-cond font-bold tracking-[0.5em] text-xs uppercase mb-6" style={{ color: GOLD }}>
            ── Booking Policy ──
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Calendar, label: "Limited Weekly Availability" },
              { icon: Lock, label: "Deposit Required to Secure Session" },
              { icon: BadgeCheck, label: "All Bookings Confirmed in Advance" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 justify-center md:justify-start">
                <Icon className="w-6 h-6 shrink-0" style={{ color: GOLD }} />
                <span className="font-cond font-bold tracking-[0.15em] text-xs uppercase text-bone/90">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA BAND */}
        <section
          className="mt-12 p-8 md:p-12 grid md:grid-cols-12 gap-8 items-center"
          style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_SOFT} 100%)`, color: "#000" }}
        >
          <div className="md:col-span-7">
            <div className="font-display text-3xl md:text-5xl leading-tight">
              WHERE CULTURE, CONTENT,<br />AND CREATORS <em className="font-brush italic">meet.</em>
            </div>
          </div>
          <div className="md:col-span-5 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:bookbwfmedia@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Mail className="w-4 h-4" /> Book Now
            </a>
            <a
              href="https://instagram.com/bwf.media"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Instagram className="w-4 h-4" /> DM @bwf.media
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-12 grid md:grid-cols-2 gap-6 pt-8 border-t border-border">
          <div className="space-y-2 font-cond tracking-[0.15em] text-sm text-bone/80">
            <div className="flex items-center gap-3"><MapPin className="w-4 h-4" style={{ color: GOLD }} /> BWFMedia Studio (Location Provided After Booking)</div>
            <div className="flex items-center gap-3"><Instagram className="w-4 h-4" style={{ color: GOLD }} /> @bwf.media</div>
            <div className="flex items-center gap-3"><Mail className="w-4 h-4" style={{ color: GOLD }} /> bookbwfmedia@gmail.com</div>
            <div className="flex items-center gap-3"><Phone className="w-4 h-4" style={{ color: GOLD }} /> (470) 333-6136</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
