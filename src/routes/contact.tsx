import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { z } from "zod";
import {
  Mail,
  MapPin,
  ArrowRight,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  Linkedin,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact BWF Media — Bookings & Partnerships" },
      {
        name: "description",
        content: "Get in touch with BWF Media TV. Studio bookings, partnerships, press, and brand collaborations.",
      },
      { property: "og:title", content: "Contact BWF Media — Bookings & Partnerships" },
      { property: "og:description", content: "Studio bookings, partnerships, press, and brand collaborations." },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(10, "Tell us a bit more").max(2000),
});

const socials = [
  { href: "https://youtube.com/@bwfmedia", label: "YouTube", Icon: Youtube },
  { href: "https://instagram.com/bwfmediatv", label: "Instagram", Icon: Instagram },
  { href: "https://tiktok.com/@bwfmediatv", label: "TikTok", Icon: Music2 },
  { href: "https://x.com/bwfmediatv", label: "X / Twitter", Icon: Twitter },
  { href: "https://facebook.com/bwfmediatv", label: "Facebook", Icon: Facebook },
  { href: "https://linkedin.com/company/bwfmediatv", label: "LinkedIn", Icon: Linkedin },
];

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your inputs");
      return;
    }
    setSubmitting(true);
    try {
      const mail = `mailto:bookings@bwfmedia.company?subject=${encodeURIComponent(parsed.data.subject)}&body=${encodeURIComponent(
        `${parsed.data.message}\n\n— ${parsed.data.name}\n${parsed.data.email}`,
      )}`;
      window.location.href = mail;
      toast.success("Opening your email client…");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-bone antialiased">
      <Toaster />

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(60% 50% at 50% 30%, rgba(255,45,45,0.25), transparent 70%)" }}
        />
        <div className="relative max-w-6xl mx-auto px-6 md:px-12 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-white/15 bg-white/5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-blood animate-pulse" />
              <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/80">Get In Touch</span>
            </div>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[0.9] uppercase text-bone">
              Let's Make
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
                Something Loud
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-bone/70 leading-relaxed">
              Bookings, partnerships, press — drop us a line and we'll get back within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-12 py-16 grid md:grid-cols-5 gap-12">
        <aside className="md:col-span-2 space-y-10">
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-3">Email</div>
            <a
              href="mailto:bookings@bwfmedia.company"
              className="inline-flex items-center gap-3 text-bone hover:text-blood transition-colors"
            >
              <Mail size={18} /> bookings@bwfmedia.company
            </a>
          </div>
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-3">Studio</div>
            <div className="inline-flex items-start gap-3 text-bone/80">
              <MapPin size={18} className="mt-0.5" />
              <span>
                By appointment only
                <br />
                Book a session online
              </span>
            </div>
          </div>
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-3">Follow</div>
            <div className="flex flex-wrap gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-10 h-10 flex items-center justify-center border border-white/15 text-bone hover:bg-blood hover:border-blood transition-colors"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/10">
            <RouterLink
              to="/studio"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors"
            >
              Book a Shoot <ArrowRight size={16} />
            </RouterLink>
          </div>
        </aside>

        <form onSubmit={onSubmit} className="md:col-span-3 space-y-5 border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                required
                className="w-full bg-black border border-white/15 px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors"
                placeholder="Your full name"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
                required
                className="w-full bg-black border border-white/15 px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors"
                placeholder="you@example.com"
              />
            </Field>
          </div>
          <Field label="Subject">
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              maxLength={150}
              required
              className="w-full bg-black border border-white/15 px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors"
              placeholder="Booking, partnership, press…"
            />
          </Field>
          <Field label="Message">
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={2000}
              required
              rows={6}
              className="w-full bg-black border border-white/15 px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors resize-none"
              placeholder="Tell us about your project, dates, and goals."
            />
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Message
          </button>
        </form>
      </section>

      <div className="border-t border-white/10" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/50 mb-2 block">
        {label}
      </span>
      {children}
    </label>
  );
}
