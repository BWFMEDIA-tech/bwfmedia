import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { format } from "date-fns";
import {
  Mail, Instagram, Phone, MapPin, Mic, Clapperboard, Camera, Smartphone,
  Calendar, Lock, CheckCircle2, User, Users, Plane, ArrowRight, Zap,
  Clock, Loader2, Radio,
} from "lucide-react";
import { FutureShell, HUDFrame, SectionTag, GOLD, GOLD_GLOW } from "@/components/site/FutureShell";
import heroVideo from "@/assets/studio-hero.mp4.asset.json";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const services = [
  { icon: Mic,          title: "ARTIST INTERVIEWS" },
  { icon: Clapperboard, title: "MUSIC VIDEO CONTENT" },
  { icon: Mic,          title: "PODCAST RECORDING" },
  { icon: Camera,       title: "PRESS + MEDIA SESSIONS" },
  { icon: Smartphone,   title: "SOCIAL CONTENT PACKS" },
];

function StudioPage() {
  return (
    <FutureShell label="STUDIO / NODE 02">
      <main className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        {/* HERO */}
        <section className="relative pt-10 md:pt-16 pb-20">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <video
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
          </div>
          <div className="font-cond tracking-[0.5em] text-[10px] uppercase text-bone/60">
            BWF / Media <span style={{ color: GOLD }}>// node_02_active</span>
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
            cinematic lighting, and brand-ready delivery — every frame engineered.
          </p>
        </section>

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
          <SectionTag>Schedule // Studio Session</SectionTag>
          <h2 className="mt-6 font-display text-5xl md:text-7xl uppercase">
            BOOK <span style={{ color: GOLD }}>YOUR SESSION</span>
          </h2>
          <p className="mt-3 text-bone/75 max-w-xl">
            Limited weekly slots. Lock in your transmission window below.
          </p>
          <StudioBookingCalendar />
        </section>

        {/* FOOTER */}
        <section className="pt-10 grid md:grid-cols-2 gap-8">
          <HUDFrame className="p-7">
            <div className="font-display text-5xl md:text-6xl">
              <span className="text-bone">BWF</span><span style={{ color: GOLD }}>MEDIA</span>
            </div>
            <div className="mt-1 font-cond tracking-[0.35em] text-[10px] uppercase text-bone/60">
              Visuals That Move Culture
            </div>
          </HUDFrame>
          <div className="space-y-3 font-cond tracking-[0.18em] text-sm self-center">
            {[
              { Icon: MapPin,    label: "Location Provided After Booking", href: "#" },
              { Icon: Instagram, label: "@bwf.media", href: "https://instagram.com/bwf.media" },
              { Icon: Mail,      label: "bookbwfmedia@gmail.com", href: "mailto:bookbwfmedia@gmail.com" },
              { Icon: Phone,     label: "(470) 333-6136", href: "tel:+14703336136" },
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