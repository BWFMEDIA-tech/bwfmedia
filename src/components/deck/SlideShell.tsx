import { motion } from "framer-motion";
import grunge from "@/assets/grunge-bg.jpg";
import logo from "@/assets/bwf-logo.jpg";

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
      className="relative w-full h-full overflow-hidden grunge-overlay"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Red corner accent */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
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
