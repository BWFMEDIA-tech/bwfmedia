import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  Mail, Instagram, Phone, MapPin, Mic, Clapperboard, Camera, Smartphone,
  Calendar, Lock, CheckCircle2, User, Users, Plane, ArrowRight, Zap,
  Clock, Loader2, Radio,
} from "lucide-react";
import { FutureShell, HUDFrame, SectionTag, GOLD, GOLD_GLOW } from "@/components/site/FutureShell";
import heroVideo from "@/assets/studio-hero.mp4.asset.json";
import { FuturisticCalendar } from "@/components/FuturisticCalendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "BWF Media Studio - Studio Bookings Only" },
      { name: "description", content: "Premium media production hub for artists & creators. Book studio time at BWF Media for interviews, music video content, podcast recording, and press sessions." },
      { property: "og:title", content: "BWF Media Studio - Where Culture, Content & Creators Meet" },
      { property: "og:description", content: "Premium studio bookings for artists & creators. Professional sound, lighting, and brand-ready delivery." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfmedia.company/studio" },
    ],
    links: [{ rel: "canonical", href: "https://bwfmedia.company/studio" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Media Production & Studio Bookings",
          provider: {
            "@type": "Organization",
            name: "BWF Media TV",
            url: "https://bwfmedia.company",
          },
          areaServed: "US",
          name: "BWF Media Studio Bookings",
          description:
            "Premium studio sessions for artist interviews, music video content, podcast recording, press, and social content packs.",
          url: "https://bwfmedia.company/studio",
        }),
      },
    ],
  }),
  component: StudioPage,
});

const services = [
  { icon: Mic,          title: "ARTIST INTERVIEWS" },
  { icon: Clapperboard, title: "MUSIC VIDEO CONTENT" },
  { icon: Mic,          title: "PODCAST RECORDING" },
  { icon: Camera,       title: "PRESS + MEDIA SESSIONS" },
  { icon: Smartphone,   title: "SOCIAL CONTENT PACKS" },
];

function StudioPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  return (
    <FutureShell label="STUDIO BOOKINGS">
      {/* HERO */}
      <section ref={heroRef} className="relative pt-10 md:pt-16 pb-20">
        <motion.div
          style={{ opacity: heroFade }}
          className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          <motion.video
            style={{ y: videoY, scale: videoScale }}
            src={heroVideo.url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-50"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 60%, #000 100%)",
            }}
          />
        </motion.div>
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="font-cond tracking-[0.5em] text-[10px] uppercase text-bone/60">
            BWF Media TV <span style={{ color: GOLD }}>· Where Culture Goes Viral</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-6 font-display leading-[0.82] text-6xl md:text-[8.5rem] uppercase"
          >
            <span className="block text-bone">STUDIO</span>
            <span
              className="block"
              style={{
                background: `linear-gradient(180deg, ${GOLD_GLOW}, ${GOLD} 60%, #6b4f1f)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 28px ${GOLD}66)`,
              }}
            >
              BOOKINGS
            </span>
            <span className="block text-bone/30" style={{ WebkitTextStroke: `2px ${GOLD}`, color: "transparent" }}>
              ONLY
            </span>
          </motion.h1>

          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 font-cond font-bold tracking-[0.3em] text-[11px] uppercase"
               style={{ background: GOLD, color: "#000" }}>
            <Zap className="w-3 h-3" /> Premium Production Hub
          </div>

          <p className="mt-8 max-w-2xl text-bone/80 text-base md:text-lg leading-relaxed">
            A controlled creative environment for artists & creators. Calibrated sound,
            cinematic lighting, and brand-ready delivery - every frame engineered.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 md:px-10 pb-24">

        {/* LOCATION */}
        <section className="pb-16">
          <HUDFrame className="p-8 md:p-10">
            <div className="flex items-start gap-5">
              <div className="shrink-0 w-14 h-14 grid place-items-center"
                   style={{ border: `1px solid ${GOLD}`, background: `${GOLD}15`, boxShadow: `0 0 20px ${GOLD}55` }}>
                <MapPin className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <div className="flex-1">
                <h2 className="font-cond font-bold tracking-[0.2em] text-base md:text-lg uppercase" style={{ color: GOLD }}>
                  All Sessions Recorded At BWFMedia Studio
                </h2>
                <p className="mt-2 text-bone/75">We do not operate as a mobile setup for standard bookings.</p>
                <div className="my-6 h-px" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                <div className="grid sm:grid-cols-3 gap-3">
                  {["High-Quality Visuals","Professional Sound + Lighting","Consistent Brand Production"].map(t => (
                    <div key={t} className="flex items-center gap-2 px-3 py-3"
                         style={{ border: `1px solid ${GOLD}33`, background: "rgba(212,162,76,0.04)" }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                      <span className="font-cond tracking-[0.12em] text-[11px] uppercase text-bone/85">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </HUDFrame>
        </section>

        {/* FEATURED VIDEO */}
        <section className="py-16">
          <SectionTag>Featured // Inside The Studio</SectionTag>
          <HUDFrame className="mt-10 p-4 md:p-6">
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/TwEQ8rszojQ"
                title="BWF Media Studio - Featured Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </HUDFrame>
        </section>



        {/* SERVICES */}
        <section className="py-16">
          <SectionTag>Services Available</SectionTag>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4">
            {services.map(({ icon: Icon, title }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <HUDFrame className="p-5 text-center h-full hover:translate-y-[-2px] transition-transform">
                  <div className="font-cond text-[10px] tracking-[0.3em]" style={{ color: GOLD }}>
                    0{i + 1}
                  </div>
                  <Icon className="w-8 h-8 mx-auto mt-3" style={{ color: GOLD }} />
                  <div className="mt-4 font-cond font-bold tracking-[0.15em] text-[11px] uppercase text-bone/90 leading-tight">
                    {title}
                  </div>
                </HUDFrame>
              </motion.div>
            ))}
          </div>
        </section>

        {/* DETAILS */}
        <section className="py-16 grid md:grid-cols-3 gap-5">
          {/* Includes */}
          <HUDFrame className="p-7">
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase" style={{ color: GOLD }}>// Module_A</div>
            <h3 className="mt-2 font-display text-2xl uppercase text-bone">Studio Includes</h3>
            <ul className="mt-5 space-y-3">
              {[
                { icon: Camera,       text: "Professional filming setup" },
                { icon: Clapperboard, text: "Directed shoot sessions" },
                { icon: Mic,          text: "Capture & editing options" },
                { icon: CheckCircle2, text: "Brand-ready delivery formats" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                  <span className="text-bone/85 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </HUDFrame>

          {/* Crew */}
          <HUDFrame className="p-7">
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase" style={{ color: GOLD }}>// Module_B</div>
            <h3 className="mt-2 font-display text-2xl uppercase text-bone">Crew Size</h3>
            <ul className="mt-5 space-y-4">
              {[
                { icon: User,  title: "SOLO PRODUCTION", sub: "1 Operator" },
                { icon: Users, title: "DUO PRODUCTION",  sub: "2 Operators" },
                { icon: Users, title: "FULL CREW",       sub: "3–4 Operators" },
              ].map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <div>
                    <div className="font-cond font-bold tracking-[0.15em] text-[11px] uppercase text-bone/90">{title}</div>
                    <div className="text-bone/60 text-xs">{sub}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-bone/10 text-bone/55 text-[11px]">
              Final crew determined by project scope.
            </div>
          </HUDFrame>

          {/* Travel */}
          <HUDFrame className="p-7">
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase" style={{ color: GOLD }}>// Module_C</div>
            <h3 className="mt-2 font-display text-2xl uppercase text-bone">Travel Bookings</h3>
            <Plane className="w-7 h-7 mt-4" style={{ color: GOLD }} />
            <p className="mt-3 text-bone/85 text-sm">Available exclusively for:</p>
            <ul className="mt-3 space-y-2 text-bone/85 text-sm">
              {["High-budget productions","Live events","Brand collaborations"].map(t => (
                <li key={t} className="flex gap-2"><span style={{ color: GOLD }}>▸</span> {t}</li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-bone/10 text-bone/55 text-[11px]">
              Not included in standard sessions.
            </div>
          </HUDFrame>
        </section>

        {/* POLICY */}
        <section className="py-16">
          <SectionTag>Booking Protocol</SectionTag>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { icon: Calendar,     title: "LIMITED WEEKLY AVAILABILITY", n: "01" },
              { icon: Lock,         title: "DEPOSIT REQUIRED",            n: "02" },
              { icon: CheckCircle2, title: "CONFIRMED IN ADVANCE",        n: "03" },
            ].map(({ icon: Icon, title, n }) => (
              <HUDFrame key={title} className="p-6">
                <div className="flex items-center justify-between">
                  <Icon className="w-7 h-7" style={{ color: GOLD }} />
                  <span className="font-display text-3xl text-bone/15">{n}</span>
                </div>
                <div className="mt-4 font-cond font-bold tracking-[0.18em] text-xs uppercase text-bone/90">
                  {title}
                </div>
              </HUDFrame>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <SectionTag>Schedule Your Studio Session</SectionTag>
          <h2 className="mt-6 font-display text-5xl md:text-7xl uppercase">
            BOOK <span style={{ color: GOLD }}>YOUR SESSION</span>
          </h2>
          <p className="mt-3 text-bone/75 max-w-xl">
            Limited weekly slots. Reserve your studio time below.
          </p>
          <StudioBookingCalendar />
        </section>

        {/* FOOTER */}
        <section className="pt-10 grid md:grid-cols-2 gap-8">
          <HUDFrame className="p-7">
            <div className="font-display text-5xl md:text-6xl">
              <span className="text-bone">BWF MEDIA </span><span style={{ color: GOLD }}>TV</span>
            </div>
            <div className="mt-1 font-cond tracking-[0.35em] text-[10px] uppercase text-bone/60">
              Where Culture Goes Viral
            </div>
          </HUDFrame>
          <div className="space-y-3 font-cond tracking-[0.18em] text-sm self-center">
            {[
              { Icon: MapPin,    label: "Location Provided After Booking", href: "#" },
              { Icon: Instagram, label: "@bwfmediatv", href: "https://instagram.com/bwfmediatv" },
              { Icon: Mail,      label: "bookbwfmedia@gmail.com", href: "mailto:bookbwfmedia@gmail.com" },
            ].map(({ Icon, label, href }) => (
              <a key={label} href={href} className="flex items-center gap-3 text-bone/85 hover:text-bone transition group">
                <span className="w-8 h-8 grid place-items-center" style={{ border: `1px solid ${GOLD}55` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                </span>
                <span className="group-hover:translate-x-1 transition-transform">{label}</span>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-bone/10 font-display text-2xl md:text-3xl tracking-wide text-center uppercase">
          Where <span style={{ color: GOLD }}>Culture, Content,</span> and{" "}
          <span style={{ color: GOLD }}>Creators</span> Meet.
        </div>
      </main>
    </FutureShell>
  );
}

const SESSION_TYPES: { name: string; price: string; pkg?: string }[] = [
  { name: "Artist Interview",      price: "$250" },
  { name: "Music Video Content",   price: "$750" },
  { name: "Podcast Recording",     price: "$200" },
  { name: "Press + Media Session", price: "$350" },
  { name: "Social Content Pack",   price: "$300" },
  // Production packages (trigger checkout with prefilled package)
  { name: "Basic Package — 1hr Shoot",        price: "$150", pkg: "studio_1hr" },
  { name: "Standard Package — 2hr Shoot",     price: "$275", pkg: "studio_2hr" },
  { name: "Premium Package — Half Day (4h)",  price: "$500", pkg: "studio_4hr" },
  { name: "Flagship Package — Full Day (8h)", price: "$900", pkg: "studio_8hr" },
];
const CREW_SIZES = ["Solo (1 Operator)", "Duo (2 Operators)", "Full Crew (3–4)"];
const DURATIONS = ["1 Hour", "2 Hours", "Half Day (4h)", "Full Day (8h)"];
const TIME_SLOTS = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"];

function StudioBookingCalendar() {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0].name);
  const [crewSize, setCrewSize] = useState(CREW_SIZES[0]);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "w-full bg-black/60 px-4 py-3 font-cond tracking-[0.15em] text-sm text-bone placeholder:text-bone/30 focus:outline-none transition";
  const inputStyle = { border: `1px solid ${GOLD}44` } as React.CSSProperties;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return toast.error("Select a date");
    if (!time) return toast.error("Select a time slot");
    if (!name || !email) return toast.error("Fill in all required fields");
    setSubmitting(true);
    let bookingId: string | null = null;
    try {
      const res = await fetch("/api/public/studio-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          email,
          phone: phone || null,
          session_type: sessionType,
          crew_size: crewSize,
          duration,
          preferred_date: format(date, "yyyy-MM-dd"),
          preferred_time: time,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        bookingId = data?.id ?? null;
      }
    } catch {
      bookingId = null;
    }
    if (!bookingId) {
      setSubmitting(false);
      toast.error("Booking failed. Please try again.");
      return;
    }
    toast.success("Session locked in. Redirecting to checkout…");
    const selected = SESSION_TYPES.find((s) => s.name === sessionType);
    navigate({
      to: "/pay/$bookingId",
      params: { bookingId },
      search: { table: "studio_bookings", ...(selected?.pkg ? { pkg: selected.pkg } : {}) },
    });
  }

  return (
    <HUDFrame className="mt-10 p-6 md:p-10">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar side */}
        <div>
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 flex items-center gap-2">
            <Calendar className="w-3 h-3" style={{ color: GOLD }} />
            Step 01 // Select Date
          </div>
          <div
            className="mt-4 p-3"
            style={{ background: "rgba(212,162,76,0.04)", border: `1px solid ${GOLD}33` }}
          >
            <FuturisticCalendar
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              accent={GOLD}
            />
          </div>

          <div className="mt-6 font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 flex items-center gap-2">
            <Clock className="w-3 h-3" style={{ color: GOLD }} />
            Step 02 // Select Time Slot
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const active = time === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className="py-2.5 font-cond tracking-[0.2em] text-[11px] uppercase transition-all"
                  style={{
                    border: `1px solid ${active ? GOLD : GOLD + "44"}`,
                    background: active ? GOLD : "transparent",
                    color: active ? "#000" : "rgba(245,235,210,0.8)",
                    boxShadow: active ? `0 0 20px ${GOLD}66` : "none",
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
                Crew Size
              </label>
              <select
                className={inputClass}
                style={inputStyle}
                aria-label="Crew Size"
                value={crewSize}
                onChange={(e) => setCrewSize(e.target.value)}
              >
                {CREW_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-black">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
                Duration
              </label>
              <select
                className={inputClass}
                style={inputStyle}
                aria-label="Duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d} className="bg-black">{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form side */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 flex items-center gap-2">
            <Radio className="w-3 h-3" style={{ color: GOLD }} />
            Step 03 // Identify & Brief
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Session Type
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              aria-label="Session Type"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
            >
              {SESSION_TYPES.map((s) => (
                <option key={s.name} value={s.name} className="bg-black">
                  {s.name} - {s.price}
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-1.5">
              {SESSION_TYPES.map((s) => {
                const active = sessionType === s.name;
                return (
                  <button
                    type="button"
                    key={s.name}
                    onClick={() => setSessionType(s.name)}
                    className="flex items-center justify-between px-3 py-2 font-cond tracking-[0.15em] text-[11px] uppercase transition"
                    style={{
                      border: `1px solid ${active ? GOLD : GOLD + "33"}`,
                      background: active ? "rgba(212,162,76,0.12)" : "transparent",
                      color: active ? "#f5ebd2" : "rgba(245,235,210,0.75)",
                    }}
                  >
                    <span>{s.name}</span>
                    <span style={{ color: GOLD }}>{s.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Full Name *
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              aria-label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name / Artist name"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
                Email *
              </label>
              <input
                type="email"
                className={inputClass}
                style={inputStyle}
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </div>
            <div>
              <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
                Phone
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                aria-label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Project Notes
            </label>
            <textarea
              className={inputClass}
              style={inputStyle}
              aria-label="Project Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us about your session..."
              rows={4}
            />
          </div>

          <div
            className="px-4 py-3 font-cond tracking-[0.2em] text-[11px] uppercase"
            style={{ background: "rgba(212,162,76,0.06)", border: `1px solid ${GOLD}33`, color: "rgba(245,235,210,0.85)" }}
          >
            <span className="text-bone/50">Slot //</span>{" "}
            <span style={{ color: GOLD }}>
              {date ? format(date, "MMM d, yyyy") : "-"} @ {time || "-"} · {duration}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 font-cond font-bold tracking-[0.3em] text-xs uppercase transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: GOLD, color: "#000", boxShadow: `0 0 30px ${GOLD}66` }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Transmitting...</>
            ) : (
              <><Zap className="w-4 h-4" /> Lock In Session <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center font-cond tracking-[0.2em] text-[10px] uppercase text-bone/45">
            <Lock className="inline w-3 h-3 mr-1" style={{ color: GOLD }} />
            Deposit required after confirmation
          </p>
        </form>
      </div>
    </HUDFrame>
  );
}