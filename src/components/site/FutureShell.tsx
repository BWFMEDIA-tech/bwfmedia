import { motion } from "framer-motion";

export const GOLD = "#D4A24C";
export const GOLD_GLOW = "#F5C56B";

// Red/black/white theme accents (live-review + sibling pages)
const RED = "#FF2D2D";
const RED_GLOW = "#FF4D4D";

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
        backgroundColor: "#000000",
        backgroundImage: [
          `radial-gradient(ellipse 70% 50% at 15% 0%, ${RED}33, transparent 60%)`,
          `radial-gradient(ellipse 60% 50% at 90% 100%, ${RED}22, transparent 65%)`,
          "linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
        ].join(","),
      }}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: `linear-gradient(${RED}55 1px, transparent 1px), linear-gradient(90deg, ${RED}55 1px, transparent 1px)`,
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
          background: `linear-gradient(90deg, transparent, ${RED_GLOW}, transparent)`,
          boxShadow: `0 0 24px ${RED}cc`,
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
        style={{ backgroundColor: RED }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: RED_GLOW }}
      />

      <div className="relative z-10">{children}</div>

      {/* Bottom accent strip */}
      <div
        className="relative h-[2px] z-20"
        style={{ background: `linear-gradient(90deg, transparent, ${RED}, transparent)` }}
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