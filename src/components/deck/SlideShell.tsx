import { motion } from "framer-motion";
import logo from "@/assets/tunevio-logo.png";

export function SlideShell({
  children,
  variant = "dark",
  number,
  total,
  label,
}: {
  children: React.ReactNode;
  variant?: "dark" | "blood" | "split";
  number?: number;
  total?: number;
  label?: string;
}) {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: "#05060a",
        backgroundImage: [
          "radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.35 0.18 25 / 0.35), transparent 60%)",
          "radial-gradient(ellipse 70% 50% at 85% 90%, oklch(0.30 0.15 280 / 0.30), transparent 60%)",
          "radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.20 0.10 200 / 0.20), transparent 70%)",
          "linear-gradient(180deg, #05060a 0%, #0a0a14 50%, #05060a 100%)",
        ].join(","),
      }}
    >
      {/* Futuristic grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.65 0.28 25 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.28 25 / 0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.75 0.25 25 / 0.9), transparent)",
          boxShadow: "0 0 20px oklch(0.65 0.28 25 / 0.8)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Subtle scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] z-[1]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, oklch(0.98 0.01 60) 3px, transparent 4px)",
        }}
      />

      {/* Red corner accent */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-50 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: "oklch(0.45 0.20 280)" }}
      />

      {/* Top brand strip */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-12 py-6 z-20">
        <div className="flex items-center gap-3">
          <img src={logo} alt="BWF Media" className="w-8 h-8 object-contain" />
          <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/80">
            BWF Media TV
          </span>
        </div>
        {label && (
          <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase" style={{ color: "var(--blood)" }}>
            {label}
          </span>
        )}
      </div>

      {/* Slide number */}
      {number && total && (
        <div className="absolute bottom-8 right-12 z-20 flex items-baseline gap-2 font-cond">
          <span className="font-display text-5xl leading-none" style={{ color: "var(--blood)" }}>
            {String(number).padStart(2, "0")}
          </span>
          <span className="text-bone/40 text-sm">/ {String(total).padStart(2, "0")}</span>
        </div>
      )}

      {/* Bottom torn strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 z-20" style={{ background: "var(--gradient-blood)" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full h-full flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}
