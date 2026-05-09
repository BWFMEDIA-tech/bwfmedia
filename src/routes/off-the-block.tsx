import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  Mail, Instagram, Phone, Mic, Camera, Globe, PlayCircle,
  Check, Users, Tv, Youtube, Radio, Zap, ArrowRight,
  Calendar as CalendarIcon, Clock, MapPin, Loader2,
} from "lucide-react";
import { FutureShell, HUDFrame, SectionTag, GOLD, GOLD_GLOW } from "@/components/site/FutureShell";
import heroVideo from "@/assets/off-the-block-hero.mp4.asset.json";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/off-the-block")({
  head: () => ({
    meta: [
      { title: "BWF Off The Block - Street Interviews & Real Conversations" },
      { name: "description", content: "BWF Off The Block: on-location street interviews where culture, community, and real voices meet. Book a pull-up shoot with BWF Media." },
      { property: "og:title", content: "BWF Off The Block - The Streets. The People. The Real." },
      { property: "og:description", content: "Raw, on-location interviews from the block to the world. Tap in with BWF Media." },
    ],
  }),
  component: OffTheBlockPage,
});

function OffTheBlockPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  return (
    <FutureShell label="STREET INTERVIEWS">
      <main className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        {/* HERO */}
        <section ref={heroRef} className="pt-10 md:pt-16 pb-20 relative">
          {/* Background video */}
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
                background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 60%, #000 100%)`,
              }}
            />
          </motion.div>

          <div className="font-cond tracking-[0.5em] text-[10px] uppercase text-bone/60">
            BWF Media TV <span style={{ color: GOLD }}>· Where Culture Goes Viral</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-6 font-display leading-[0.82] text-7xl md:text-[10rem] uppercase"
          >
            <span className="block text-bone">OFF</span>
            <span className="block text-bone/30" style={{ WebkitTextStroke: `2px ${GOLD}`, color: "transparent" }}>THE</span>
            <span
              className="block"
              style={{
                background: `linear-gradient(180deg, ${GOLD_GLOW}, ${GOLD} 60%, #6b4f1f)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 30px ${GOLD}66)`,
              }}
            >
              BLOCK
            </span>
          </motion.h1>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div
              className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase px-4 py-2"
              style={{ background: GOLD, color: "#000" }}
            >
              The Streets · The People · The Real
            </div>
            <div className="flex items-center gap-2 font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60">
              <Radio className="w-3 h-3" style={{ color: GOLD }} />
              filmed on location
            </div>
          </div>

          <p className="mt-10 max-w-2xl text-bone/80 text-base md:text-lg leading-relaxed">
            On-location street interviews tapping into culture, community, and the voices
            that never get airtime. Cameras rolling. No script. Real stories.
          </p>

          {/* Stat HUD */}
          <div className="mt-12 grid grid-cols-3 gap-3 max-w-2xl">
            {[
              { k: "100%", v: "UNCUT" },
              { k: "4K", v: "CAPTURE" },
              { k: "24/7", v: "ON CALL" },
            ].map((s) => (
              <HUDFrame key={s.v} className="px-4 py-3 text-center">
                <div className="font-display text-3xl md:text-4xl" style={{ color: GOLD }}>{s.k}</div>
                <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 mt-1">{s.v}</div>
              </HUDFrame>
            ))}
          </div>
        </section>

        {/* PILLARS */}
        <section className="py-16">
          <SectionTag>System // Pillars</SectionTag>
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {[
              { icon: Mic,        n: "01", title: "REAL CONVERSATIONS", desc: "Raw and uncut from the block to the world." },
              { icon: Camera,     n: "02", title: "ON LOCATION",        desc: "We pull up where the culture is happening." },
              { icon: Globe,      n: "03", title: "REAL STORIES",       desc: "Artists, entrepreneurs, everyday people making moves." },
              { icon: PlayCircle, n: "04", title: "CONTENT THAT HITS",  desc: "Built for YouTube, Instagram, TikTok and beyond." },
            ].map(({ icon: Icon, n, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <HUDFrame className="p-6 md:p-7 h-full group hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 grid place-items-center rounded"
                      style={{ border: `1px solid ${GOLD}88`, background: `${GOLD}10` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <span className="font-display text-3xl text-bone/15">{n}</span>
                  </div>
                  <div className="mt-5 font-cond font-bold tracking-[0.2em] text-sm uppercase" style={{ color: GOLD }}>
                    {title}
                  </div>
                  <p className="mt-2 text-bone/75 text-sm md:text-base">{desc}</p>
                </HUDFrame>
              </motion.div>
            ))}
          </div>
        </section>

        {/* WHAT WE COVER */}
        <section className="py-16">
          <SectionTag>Coverage Matrix</SectionTag>
          <HUDFrame className="mt-10 p-8 md:p-10">
            <div className="grid md:grid-cols-3 gap-4">
              {["Artist Interviews","Street Talk","Upcoming Events","Local Businesses","Community Voices","& More"].map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: "rgba(212,162,76,0.05)", border: `1px solid ${GOLD}33` }}
                >
                  <span className="font-cond text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Check className="w-4 h-4" style={{ color: GOLD }} />
                  <span className="font-cond tracking-[0.15em] text-sm uppercase text-bone/90">{item}</span>
                </div>
              ))}
            </div>
          </HUDFrame>
        </section>

        {/* WHY IT MATTERS */}
        <section className="py-16 text-center">
          <SectionTag>Mission // Why It Matters</SectionTag>
          <p className="mx-auto mt-8 max-w-2xl text-bone/85 text-base md:text-lg">
            We amplify real stories, real people, real situations. BWF Off The Block
            gives a voice to the culture and keeps it authentic - frame by frame.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Users,  label: "FOR THE CULTURE" },
              { icon: Camera, label: "FOR THE COMMUNITY" },
              { icon: Tv,     label: "FOR THE WORLD" },
            ].map(({ icon: Icon, label }) => (
              <HUDFrame key={label} className="p-6">
                <Icon className="w-9 h-9 mx-auto" style={{ color: GOLD }} />
                <div className="mt-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/85">
                  {label}
                </div>
              </HUDFrame>
            ))}
          </div>
        </section>

        {/* BOOKING CALENDAR */}
        <section id="book" className="py-16">
          <SectionTag>Schedule // Pull-Up Request</SectionTag>
          <BookingCalendar />
        </section>

        {/* CTA */}
        <section className="py-16">
          <HUDFrame className="relative overflow-hidden p-10 md:p-14 text-center">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${GOLD}55, transparent 60%)`,
              }}
            />
            <Zap className="relative w-8 h-8 mx-auto mb-4" style={{ color: GOLD }} />
            <h2 className="relative font-display text-5xl md:text-7xl uppercase">
              BOOK <span style={{ color: GOLD }}>AN INTERVIEW</span>
            </h2>
            <p className="relative mt-3 text-bone/75 max-w-xl mx-auto">
              Want us to pull up to your block, event, or location? Send us a request.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:bookbwfmedia@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 font-cond font-bold tracking-[0.25em] text-xs uppercase transition-all hover:scale-[1.02]"
                style={{ background: GOLD, color: "#000", boxShadow: `0 0 30px ${GOLD}66` }}
              >
                <Mail className="w-4 h-4" /> Email Us <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/bwfmediatv"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone hover:bg-bone/5 transition"
                style={{ border: `1px solid ${GOLD}` }}
              >
                <Instagram className="w-4 h-4" /> DM Us
              </a>
            </div>
            <div className="relative mt-6 font-cond tracking-[0.4em] text-[10px] uppercase" style={{ color: GOLD }}>
              Serious Inquiries Only
            </div>
          </HUDFrame>
        </section>

        {/* FOOTER */}
        <section className="pt-10 grid md:grid-cols-2 gap-8">
          <HUDFrame className="p-7 text-center">
            <div className="font-cond tracking-[0.4em] text-[10px] uppercase text-bone/60">Powered By</div>
            <div className="mt-2 font-display text-5xl md:text-6xl">
              <span className="text-bone">BWF MEDIA </span><span style={{ color: GOLD }}>TV</span>
            </div>
            <div className="mt-1 font-cond tracking-[0.35em] text-[10px] uppercase text-bone/60">
              Where Culture Goes Viral
            </div>
          </HUDFrame>

          <div className="space-y-3 font-cond tracking-[0.18em] text-sm uppercase self-center">
            {[
              { Icon: Instagram, label: "@bwfmediatv", href: "https://instagram.com/bwfmediatv" },
              { Icon: Youtube,   label: "BWF Media TV",  href: "https://youtube.com/@bwfmediatvtv" },
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
          <span className="text-bone/80">We don't just interview people - </span>
          <span style={{ color: GOLD }}>we tell real stories.</span>
        </div>
      </main>
    </FutureShell>
  );
}

const SHOOT_TYPES = [
  "Street Interview",
  "Artist Feature",
  "Event Coverage",
  "Business Spotlight",
  "Community Story",
  "Other",
];

const TIME_SLOTS = [
  "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM",
];

function BookingCalendar() {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [shootType, setShootType] = useState<string>(SHOOT_TYPES[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const inputClass =
    "w-full bg-black/60 px-4 py-3 font-cond tracking-[0.15em] text-sm text-bone placeholder:text-bone/30 focus:outline-none transition";
  const inputStyle = { border: `1px solid ${GOLD}44` } as React.CSSProperties;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return toast.error("Select a date");
    if (!time) return toast.error("Select a time slot");
    if (!name || !email || !location) return toast.error("Fill in all required fields");
    setSubmitting(true);
    let ok = false;
    try {
      const res = await fetch('/api/public/block-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          email,
          phone: phone || null,
          shoot_type: shootType,
          location,
          preferred_date: format(date, 'yyyy-MM-dd'),
          preferred_time: time,
          notes: notes || null,
        }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    setSubmitting(false);
    if (!ok) {
      toast.error('Submission failed. Please try again.');
      return;
    }
    setDone(true);
    toast.success("Request received. We'll be in touch.");
  }

  if (done) {
    return (
      <HUDFrame className="mt-10 p-10 md:p-14 text-center">
        <Check className="w-12 h-12 mx-auto" style={{ color: GOLD }} />
        <h3 className="mt-6 font-display text-4xl md:text-5xl uppercase">
          Booking <span style={{ color: GOLD }}>Locked In</span>
        </h3>
        <p className="mt-4 text-bone/75 max-w-md mx-auto">
          Your request for <span style={{ color: GOLD }}>{date && format(date, "PPP")}</span> at{" "}
          <span style={{ color: GOLD }}>{time}</span> has been received. The BWF crew will hit you back at{" "}
          <span style={{ color: GOLD }}>{email}</span> to confirm.
        </p>
        <div className="mt-8 font-cond tracking-[0.4em] text-[10px] uppercase" style={{ color: GOLD }}>
          Request Confirmed
        </div>
      </HUDFrame>
    );
  }

  return (
    <HUDFrame className="mt-10 p-6 md:p-10">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar side */}
        <div>
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 flex items-center gap-2">
            <CalendarIcon className="w-3 h-3" style={{ color: GOLD }} />
            Step 01 // Select Date
          </div>
          <div
            className="mt-4 p-3"
            style={{ background: "rgba(212,162,76,0.04)", border: `1px solid ${GOLD}33` }}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto mx-auto")}
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
        </div>

        {/* Form side */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 flex items-center gap-2">
            <Radio className="w-3 h-3" style={{ color: GOLD }} />
            Step 03 // Identify & Brief
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Full Name *
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Shoot Type
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={shootType}
              onChange={(e) => setShootType(e.target.value)}
            >
              {SHOOT_TYPES.map((s) => (
                <option key={s} value={s} className="bg-black">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" style={{ color: GOLD }} /> Location *
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, neighborhood, or address"
              required
            />
          </div>

          <div>
            <label className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/60 block mb-2">
              Notes
            </label>
            <textarea
              className={inputClass}
              style={inputStyle}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us about the shoot..."
              rows={3}
            />
          </div>

          {/* Summary */}
          <div
            className="px-4 py-3 font-cond tracking-[0.2em] text-[11px] uppercase"
            style={{ background: "rgba(212,162,76,0.06)", border: `1px solid ${GOLD}33`, color: "rgba(245,235,210,0.85)" }}
          >
            <span className="text-bone/50">Slot //</span>{" "}
            <span style={{ color: GOLD }}>
              {date ? format(date, "MMM d, yyyy") : "-"} @ {time || "-"}
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
              <><Zap className="w-4 h-4" /> Lock In Booking <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </HUDFrame>
  );
}