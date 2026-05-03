import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Instagram, Phone, ArrowLeft } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import flyer from "@/assets/flyer-off-the-block.png";

const GOLD = "#D4A24C";

export const Route = createFileRoute("/off-the-block")({
  head: () => ({
    meta: [
      { title: "BWF Off The Block — Street Interviews & Real Conversations" },
      { name: "description", content: "BWF Off The Block: on-location street interviews where culture, community, and real voices meet. Book a pull-up shoot with BWF Media." },
      { property: "og:title", content: "BWF Off The Block — The Streets. The People. The Real." },
      { property: "og:description", content: "Raw, on-location interviews from the block to the world. Tap in with BWF Media." },
    ],
  }),
  component: OffTheBlockPage,
});

function OffTheBlockPage() {
  return (
    <div className="min-h-screen w-full bg-black text-bone">
      <header className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-12 h-12 object-contain" />
          <span className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70">BWF Media</span>
        </Link>
        <Link
          to="/"
          className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
        <img
          src={flyer}
          alt="BWF Off The Block — The Streets. The People. The Real. Street interviews and real conversations by BWF Media."
          className="w-full h-auto block shadow-2xl"
        />

        {/* CTA Bar */}
        <div
          className="mt-10 p-6 md:p-8 grid md:grid-cols-12 gap-6 items-center"
          style={{ background: GOLD, color: "#000" }}
        >
          <div className="md:col-span-7">
            <div className="font-brush text-3xl md:text-4xl tracking-wide">BOOK AN INTERVIEW</div>
            <p className="mt-1 text-black/80 text-sm md:text-base">
              Want us to pull up to your block, event, or location? Serious inquiries only.
            </p>
          </div>
          <div className="md:col-span-5 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:bookbwfmedia@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Mail className="w-4 h-4" /> Email Us
            </a>
            <a
              href="https://instagram.com/bwf.media"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-black text-bone font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-black/80 transition-colors"
            >
              <Instagram className="w-4 h-4" /> DM Us
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-cond tracking-[0.2em] text-xs uppercase text-bone/70">
          <a href="https://instagram.com/bwf.media" className="flex items-center gap-2 hover:text-bone"><Instagram className="w-4 h-4" style={{ color: GOLD }} /> @bwf.media</a>
          <a href="mailto:bookbwfmedia@gmail.com" className="flex items-center gap-2 hover:text-bone"><Mail className="w-4 h-4" style={{ color: GOLD }} /> bookbwfmedia@gmail.com</a>
          <a href="tel:+14703336136" className="flex items-center gap-2 hover:text-bone"><Phone className="w-4 h-4" style={{ color: GOLD }} /> (470) 333-6136</a>
        </div>
      </main>
    </div>
  );
}
