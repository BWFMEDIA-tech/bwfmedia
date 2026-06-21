import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Radio, Mic2, Music2, Flame, TrendingUp, Play, Sparkles, Disc3, Trophy } from "lucide-react";

/**
 * Bold bento homepage — BWF brand neon (fuchsia/magenta/cyan) on black,
 * Bebas Neue display, Inter body. Marketing-only; no live data wiring.
 */
export function HomeBento() {
  return (
    <main className="relative overflow-hidden bg-[#050505] text-white">
      {/* Ambient glow field */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 h-[680px] w-[680px] -translate-x-1/2 rounded-full opacity-60 blur-[140px]"
          style={{ background: "var(--gradient-neon-soft)" }}
        />
        <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--neon-fuchsia)]/15 blur-[130px]" />
        <div className="absolute top-2/3 -right-32 h-[420px] w-[420px] rounded-full bg-[var(--neon-cyan)]/15 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-5 pt-10 pb-16 md:pt-20 md:pb-24">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white/60">
          <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-[var(--neon-magenta)] shadow-[0_0_12px_var(--neon-magenta)]" />
          BWF Network · Live Right Now
        </div>

        <h1 className="font-display mt-6 text-[64px] leading-[0.88] tracking-tight sm:text-[96px] md:text-[148px] lg:text-[180px]">
          <span className="block text-white">REAL ARTISTS.</span>
          <span
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-neon)" }}
          >
            LIVE STAGES.
          </span>
          <span className="block text-white/85">VIRAL CULTURE.</span>
        </h1>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <p className="max-w-2xl text-lg leading-relaxed text-white/65 md:text-xl">
            BWF Network is the creator-powered entertainment platform where independent artists go live,
            release music, battle for stages, and get paid by fans — all in one place. No gatekeepers.
            Earned, never given.
          </p>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              to="/play"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black"
              style={{ background: "var(--gradient-neon)" }}
            >
              <span className="absolute inset-0 -translate-x-full bg-white/40 transition-transform duration-700 group-hover:translate-x-full" />
              <Play className="relative h-4 w-4 fill-current" />
              <span className="relative">Enter the Arena</span>
            </Link>
            <Link
              to="/artists"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white backdrop-blur transition hover:border-white/40 hover:bg-white/[0.08]"
            >
              Discover artists
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stat rail */}
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
          {[
            { k: "686M+", v: "Views shipped" },
            { k: "324K+", v: "Subscribers" },
            { k: "12K+", v: "Artists on platform" },
            { k: "24/7", v: "Live stages" },
          ].map((s) => (
            <div key={s.v} className="bg-[#070707] p-5 sm:p-6">
              <div className="font-display text-3xl text-white sm:text-4xl">{s.k}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative border-y border-white/10 bg-black/40 py-5">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-10 whitespace-nowrap pr-10 font-display text-2xl uppercase tracking-wider text-white/30 md:text-3xl">
            {Array.from({ length: 2 }).flatMap(() =>
              [
                "LIVE STAGES",
                "MIC DROP ARENA",
                "BATTLE NIGHTS",
                "MUSIC DROPS",
                "FAN MERCH",
                "OPEN STAGE",
                "CURATED EVENTS",
              ].map((w, i) => (
                <span key={w + i} className="flex items-center gap-10">
                  <Sparkles className="h-5 w-5 text-[var(--neon-magenta)]" />
                  <span>{w}</span>
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/45">
              The Network
            </div>
            <h2 className="font-display mt-2 text-4xl md:text-6xl">
              EVERYTHING <span className="text-[var(--neon-magenta)]">HAPPENING NOW.</span>
            </h2>
          </div>
          <Link
            to="/discover"
            className="hidden items-center gap-1 text-xs font-bold uppercase tracking-[0.22em] text-white/60 hover:text-white md:inline-flex"
          >
            Discover all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[170px]">
          {/* Live now — hero tile */}
          <Link
            to="/play"
            className="group relative col-span-1 row-span-2 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0a1a] via-[#0a0a18] to-black p-6 md:col-span-4 md:row-span-3"
          >
            <div
              className="absolute -inset-32 opacity-50 blur-3xl transition duration-700 group-hover:opacity-80"
              style={{ background: "var(--gradient-neon-soft)" }}
            />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--neon-magenta)]/40 bg-[var(--neon-magenta)]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--neon-magenta)]">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--neon-magenta)]" />
                  Live · Arena
                </span>
                <Radio className="h-5 w-5 text-white/40" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                  Round 3 · 12,402 watching
                </div>
                <div className="font-display mt-2 text-4xl leading-none md:text-7xl">
                  KILO vs <span className="text-[var(--neon-cyan)]">RAZE</span>
                </div>
                <div className="mt-3 max-w-md text-sm text-white/65">
                  Audience votes decide the winner. The stage is earned, not given.
                </div>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-black transition group-hover:bg-[var(--neon-cyan)]">
                  <Play className="h-3.5 w-3.5 fill-current" /> Watch live
                </div>
              </div>
            </div>
          </Link>

          {/* Mic Drop */}
          <Link
            to="/mic-drop"
            className="group relative col-span-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14] p-6 md:col-span-2 md:row-span-2"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[var(--neon-fuchsia)]/30 blur-3xl transition group-hover:bg-[var(--neon-fuchsia)]/50" />
            <div className="relative flex h-full flex-col justify-between">
              <Mic2 className="h-7 w-7 text-[var(--neon-fuchsia)]" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">
                  Open Stage
                </div>
                <div className="font-display mt-2 text-3xl md:text-4xl">MIC DROP ARENA</div>
                <div className="mt-2 text-xs text-white/60">
                  Submit a verse. Audience picks the winner. Real prizes.
                </div>
              </div>
            </div>
          </Link>

          {/* Drop of the week */}
          <Link
            to="/discover"
            className="group relative col-span-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14] p-6 md:col-span-2"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--neon-blue)]/20 via-transparent to-[var(--neon-cyan)]/20 opacity-60 transition group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <Disc3 className="h-6 w-6 text-[var(--neon-cyan)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  Drop · Fri
                </span>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl">NEW DROPS WEEKLY</div>
                <div className="text-xs text-white/55">Singles, EPs, exclusives.</div>
              </div>
            </div>
          </Link>

          {/* Trending */}
          <div className="relative col-span-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14] p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-6 w-6 text-[var(--neon-magenta)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Top 5 · Today
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {["KILO — Off The Block", "NOVA — Skyline", "RAZE — Crown Me", "SAGE — 4AM", "PLUTO — Loop"].map(
                (t, i) => (
                  <li key={t} className="flex items-center gap-3 text-white/75">
                    <span className="font-display w-5 text-lg text-white/30">{i + 1}</span>
                    <span className="truncate">{t}</span>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Become an artist CTA */}
          <Link
            to="/artist-submission"
            className="group relative col-span-1 overflow-hidden rounded-3xl border border-white/10 p-6 md:col-span-3 md:row-span-2"
            style={{ background: "var(--gradient-neon)" }}
          >
            <div className="absolute inset-0 bg-black/30 mix-blend-multiply" />
            <div className="relative flex h-full flex-col justify-between text-black">
              <Flame className="h-7 w-7" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/70">
                  For Artists
                </div>
                <div className="font-display mt-2 text-4xl md:text-6xl">
                  GET ON
                  <br />
                  THE STAGE.
                </div>
                <div className="mt-3 max-w-sm text-sm text-black/80">
                  Upload, go live, sell merch, and grow your fanbase on the only network built for
                  independents.
                </div>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition group-hover:bg-white group-hover:text-black">
                  Apply now <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>

          {/* Tonight's events */}
          <Link
            to="/events"
            className="group relative col-span-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14] p-6 md:col-span-3"
          >
            <div className="flex items-center justify-between">
              <Trophy className="h-6 w-6 text-[var(--neon-cyan)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Tonight · 9PM ET
              </span>
            </div>
            <div className="mt-3 font-display text-2xl md:text-3xl">BATTLE NIGHT · WEEK 14</div>
            <div className="mt-1 text-xs text-white/55">
              8 artists · single elimination · audience-judged. Free to watch.
            </div>
          </Link>
        </div>
      </section>

      {/* CLOSER */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0014] via-[#06000a] to-black p-10 md:p-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/45">
                The Promise
              </div>
              <h2 className="font-display mt-3 text-5xl leading-[0.9] md:text-7xl">
                THE STAGE
                <br />
                IS{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-neon)" }}
                >
                  EARNED.
                </span>
                <br />
                NOT GIVEN.
              </h2>
              <p className="mt-5 max-w-md text-white/65">
                Curated. Competitive. High energy. Every performance impacts rankings, visibility,
                and progression across the entire BWF Network.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { icon: Music2, k: "Join.", v: "Create your profile. Free." },
                { icon: Mic2, k: "Compete.", v: "Open stages, battles, tournaments." },
                { icon: TrendingUp, k: "Get Discovered.", v: "Rank up. Get paid by fans." },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl text-black"
                    style={{ background: "var(--gradient-neon)" }}
                  >
                    <row.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-2xl leading-none">{row.k}</div>
                    <div className="text-sm text-white/55">{row.v}</div>
                  </div>
                </div>
              ))}
              <Link
                to="/signup"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black"
                style={{ background: "var(--gradient-neon)" }}
              >
                Create your account
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}