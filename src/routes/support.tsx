import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, CreditCard, Music2, Radio, ShieldAlert, UserX, HelpCircle } from "lucide-react";

const SUPPORT_EMAIL = "support@tunevio.com";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — TUNEVIO" },
      { name: "description", content: "Get help with your Tunevio account, billing, uploads, live streams, battles and safety. Email support@tunevio.com." },
      { property: "og:title", content: "Support — TUNEVIO" },
      { property: "og:description", content: "Help for artists, hosts and fans on Tunevio. Contact support@tunevio.com." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tunevio.com/support" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tunevio.com/support" }],
  }),
  component: SupportPage,
});

const topics = [
  { Icon: CreditCard, title: "Billing & subscriptions", subject: "Billing question", text: "Charges, refunds, plan changes and receipts." },
  { Icon: Music2, title: "Uploads & music", subject: "Music upload help", text: "Songs, artwork, videos and distribution." },
  { Icon: Radio, title: "Live, stages & battles", subject: "Live streaming help", text: "Going live, joining stages and 1v1 battles." },
  { Icon: UserX, title: "Account & sign-in", subject: "Account help", text: "Sign-in issues, profile changes and deleting your account." },
  { Icon: ShieldAlert, title: "Safety & reports", subject: "Safety report", text: "Report abuse, harassment or copyright problems." },
  { Icon: HelpCircle, title: "Something else", subject: "General support", text: "Any other question about Tunevio." },
];

const faqs = [
  { q: "How fast will I hear back?", a: "We reply to most emails within 1–2 business days." },
  { q: "How do I cancel my subscription?", a: "Open Settings, choose your plan and cancel. You keep access until the end of the billing period." },
  { q: "How do I delete my account?", a: "Go to Settings → Delete Account. Payment and earnings records are kept as required by law." },
  { q: "How do I report someone?", a: "Use the safety menu on any message, song, profile or live session, or email us with details." },
];

const mailto = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-14">
      <header className="text-center">
        <p className="font-cond text-xs uppercase tracking-[0.3em] text-primary">Tunevio Support</p>
        <h1 className="mt-2 font-display text-3xl md:text-5xl">How can we help?</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Our team helps artists, hosts and fans with anything on Tunevio.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={mailto("Tunevio support request")} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-deep">
            <Mail size={18} /> {SUPPORT_EMAIL}
          </a>
          <Link to="/help" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 font-semibold">
            <MessageCircle size={18} /> Ask the AI Assistant
          </Link>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="font-display text-xl md:text-2xl">Choose a topic</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map(({ Icon, title, subject, text }) => (
            <a key={title} href={mailto(subject)} className="rounded-2xl border border-border bg-card/50 p-5 transition-colors hover:border-primary">
              <Icon className="text-primary" size={22} />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl md:text-2xl">Common questions</h2>
        <div className="mt-4 space-y-2">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-card/40 p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        See also our <Link to="/terms" className="text-primary underline">Terms</Link>, <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> and <Link to="/refund-policy" className="text-primary underline">Refund Policy</Link>.
      </p>
    </div>
  );
}
