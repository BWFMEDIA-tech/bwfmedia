import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import { SiteFooter } from "@/components/site/SiteFooter";

export const GOLD = "#D4A24C";
export const GOLD_GLOW = "#F5C56B";

export function FutureShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-bone"
      style={{
        backgroundColor: "#05060a",
        backgroundImage: [
          `radial-gradient(ellipse 70% 50% at 15% 0%, ${GOLD}26, transparent 60%)`,
          "radial-gradient(ellipse 60% 50% at 90% 100%, oklch(0.30 0.15 280 / 0.35), transparent 60%)",
          "linear-gradient(180deg, #05060a 0%, #0a0a14 50%, #05060a 100%)",
        ].join(","),
      }}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: `linear-gradient(${GOLD}66 1px, transparent 1px), linear-gradient(90deg, ${GOLD}66 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, black 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, black 30%, transparent 85%)",
        }}
      />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-[1]"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD_GLOW}, transparent)`,
          boxShadow: `0 0 24px ${GOLD}cc`,
        }}
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] z-[1]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, #fff 3px, transparent 4px)",
        }}
      />

      {/* Glow blobs */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: GOLD }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: "oklch(0.45 0.20 280)" }}
      />

      {/* Header */}
      <header className="relative z-20 max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-md opacity-60 group-hover:opacity-100 transition"
              style={{ background: GOLD }}
            />
            <img src={bwfLogo} alt="BWF Media" className="relative w-11 h-11 object-contain" />
          </div>
          <span className="font-cond font-bold tracking-[0.35em] text-[11px] uppercase text-bone/80">
            BWF Media TV
          </span>
        </Link>
        <div className="flex items-center gap-5">
          {label && (
            <span
              className="hidden md:inline-flex items-center gap-2 font-cond font-bold tracking-[0.4em] text-[10px] uppercase px-3 py-1.5"
              style={{ border: `1px solid ${GOLD}66`, color: GOLD }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
              />
              {label}
            </span>
          )}
          <Link
            to="/"
            className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
        </div>
      </header>

      <div className="relative z-10">{children}</div>

      <SiteFooter />

      {/* Bottom gold strip */}
      <div
        className="relative h-[2px] z-20"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />
    </div>
  );
}

export function HUDFrame({
  children,
  className = "",
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative backdrop-blur-xl ${className}`}
      style={{
        border: `1px solid ${GOLD}55`,
        background:
          "linear-gradient(180deg, rgba(212,162,76,0.08) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.25) 100%)",
        boxShadow: glow
          ? `0 0 0 1px rgba(0,0,0,0.35), 0 20px 60px -25px ${GOLD}55, inset 0 1px 0 ${GOLD}33, inset 0 -1px 0 rgba(255,255,255,0.04)`
          : undefined,
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        backdropFilter: "blur(20px) saturate(140%)",
      }}
    >
      {/* corner ticks */}
      {(["tl","tr","bl","br"] as const).map((c) => (
        <span
          key={c}
          className="absolute w-3 h-3 pointer-events-none"
          style={{
            top: c.startsWith("t") ? -1 : "auto",
            bottom: c.startsWith("b") ? -1 : "auto",
            left: c.endsWith("l") ? -1 : "auto",
            right: c.endsWith("r") ? -1 : "auto",
            borderTop: c.startsWith("t") ? `2px solid ${GOLD}` : undefined,
            borderBottom: c.startsWith("b") ? `2px solid ${GOLD}` : undefined,
            borderLeft: c.endsWith("l") ? `2px solid ${GOLD}` : undefined,
            borderRight: c.endsWith("r") ? `2px solid ${GOLD}` : undefined,
          }}
        />
      ))}
      {children}
    </div>
  );
}

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-cond font-bold tracking-[0.4em] text-[10px] uppercase" style={{ color: GOLD }}>
      <span className="w-8 h-px" style={{ background: GOLD }} />
      {children}
      <span className="w-8 h-px" style={{ background: GOLD }} />
    </div>
  );
}