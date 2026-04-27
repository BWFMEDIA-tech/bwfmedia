import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, LayoutGrid, X } from "lucide-react";
import { SLIDES } from "./slides";

const SLIDE_W = 1920;
const SLIDE_H = 1080;

function useScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / SLIDE_W, height / SLIDE_H));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef]);
  return scale;
}

export function ScaledSlide({ Slide, scale }: { Slide: () => React.ReactElement; scale: number }) {
  return (
    <div
      className="absolute"
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        left: "50%",
        top: "50%",
        marginLeft: -SLIDE_W / 2,
        marginTop: -SLIDE_H / 2,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <Slide />
    </div>
  );
}

export function Deck() {
  const [index, setIndex] = useState(0);
  const [grid, setGrid] = useState(false);
  const [fs, setFs] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useScale(containerRef);

  const next = () => setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "g" || e.key === "G") setGrid((g) => !g);
      else if (e.key === "Escape") setGrid(false);
      else if (e.key === "f" || e.key === "F") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const Current = SLIDES[index];

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar */}
      <div className="relative z-30 flex items-center justify-between px-6 py-3 border-b border-border bg-black/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-2 h-7" style={{ backgroundColor: "var(--blood)" }} />
          <span className="font-display text-xl tracking-tight text-bone">BWF MEDIA <span style={{color:"var(--blood)"}}>TV</span></span>
          <span className="font-cond text-bone/50 tracking-widest text-[10px] uppercase ml-2">Pitch Deck</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGrid((g) => !g)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border text-bone/80 hover:text-bone hover:border-blood transition-colors text-xs font-cond tracking-widest uppercase"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={toggleFs}
            className="flex items-center gap-2 px-3 py-1.5 border text-xs font-cond tracking-widest uppercase transition-colors"
            style={{ borderColor: "var(--blood)", backgroundColor: "var(--blood)", color: "var(--bone)" }}
          >
            {fs ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fs ? "Exit" : "Present"}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <ScaledSlide Slide={Current} scale={scale} />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <button
          onClick={prev}
          disabled={index === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center border-2 text-bone/80 hover:text-bone hover:border-blood disabled:opacity-30 disabled:pointer-events-none transition-colors bg-black/50 backdrop-blur"
          style={{ borderColor: "var(--border)" }}
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          disabled={index === SLIDES.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center border-2 text-bone/80 hover:text-bone hover:border-blood disabled:opacity-30 disabled:pointer-events-none transition-colors bg-black/50 backdrop-blur"
          style={{ borderColor: "var(--border)" }}
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom progress */}
      <div className="relative z-30 flex items-center gap-3 px-6 py-3 border-t border-border bg-black/80 backdrop-blur">
        <div className="font-cond font-bold tracking-widest text-xs text-bone/60 uppercase w-16">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </div>
        <div className="flex-1 flex gap-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="flex-1 h-1 transition-all hover:opacity-100"
              style={{
                backgroundColor: i <= index ? "var(--blood)" : "var(--border)",
                opacity: i === index ? 1 : 0.7,
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="font-cond text-bone/40 tracking-widest text-[10px] uppercase hidden md:block">
          ← → space · G grid · F fullscreen
        </div>
      </div>

      {/* Grid overlay */}
      <AnimatePresence>
        {grid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur p-8 overflow-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="font-cond font-bold tracking-[0.4em] text-xs uppercase mb-2" style={{ color: "var(--blood)" }}>
                  Overview
                </div>
                <h3 className="font-display text-4xl text-bone">All Slides</h3>
              </div>
              <button
                onClick={() => setGrid(false)}
                className="w-10 h-10 flex items-center justify-center border border-border text-bone hover:border-blood"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {SLIDES.map((S, i) => (
                <button
                  key={i}
                  onClick={() => { setIndex(i); setGrid(false); }}
                  className="group relative aspect-video bg-card border-2 overflow-hidden transition-all hover:scale-[1.02]"
                  style={{ borderColor: i === index ? "var(--blood)" : "var(--border)" }}
                >
                  <ThumbScaled Slide={S} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                    <span className="font-display text-2xl" style={{ color: i === index ? "var(--blood)" : "var(--bone)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThumbScaled({ Slide }: { Slide: () => React.ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useScale(ref);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      <ScaledSlide Slide={Slide} scale={scale} />
    </div>
  );
}
