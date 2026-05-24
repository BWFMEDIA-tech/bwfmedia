import { Link as RouterLink } from "@tanstack/react-router";
import { Youtube, Instagram, Facebook, Twitter, Music2, Linkedin, Mail, MapPin, ArrowRight } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";

const socials = [
  { href: "https://youtube.com/@bwfmedia", label: "YouTube", Icon: Youtube },
  { href: "https://instagram.com/bwfmediatv", label: "Instagram", Icon: Instagram },
  { href: "https://tiktok.com/@bwfmediatv", label: "TikTok", Icon: Music2 },
  { href: "https://x.com/bwfmediatv", label: "X / Twitter", Icon: Twitter },
  { href: "https://facebook.com/bwfmediatv", label: "Facebook", Icon: Facebook },
  { href: "https://linkedin.com/company/bwfmediatv", label: "LinkedIn", Icon: Linkedin },
];

const menuGroups = [
  {
    title: "Services",
    links: [
      { label: "Studio Bookings", to: "/studio" },
      { label: "Off Da Block", to: "/off-the-block" },
      { label: "Artist Interviews", href: "/#services" },
      { label: "Music Videos", href: "/#services" },
      { label: "Viral Clips", href: "/#services" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Home", to: "/" },
      { label: "Why BWF", href: "/#why" },
      { label: "Audience", href: "/#audience" },
      { label: "Contact", to: "/contact" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Bookings",
    links: [
      { label: "Book a Shoot", to: "/studio" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Packages", href: "/#pricing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-black border-t border-white/10">
      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand column */}
        <div className="lg:col-span-2">
          <RouterLink to="/" className="inline-flex items-center gap-3">
            <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 object-contain" />
          </RouterLink>
          <p className="mt-4 text-sm text-bone/55 max-w-sm leading-relaxed">
            Where culture goes viral. A premium media network for artists, brands, and the moments that matter.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="mailto:bookings@bwfmedia.company"
              className="flex items-center gap-2 text-sm text-bone/60 hover:text-blood transition-colors"
            >
              <Mail size={14} className="text-blood" />
              bookings@bwfmedia.company
            </a>
            <div className="flex items-start gap-2 text-sm text-bone/60">
              <MapPin size={14} className="text-blood mt-0.5" />
              <span>By appointment only — Book a session online</span>
            </div>
          </div>
        </div>

        {/* Menu columns */}
        {menuGroups.map((group) => (
          <div key={group.title}>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-4">
              {group.title}
            </div>
            <ul className="space-y-2.5">
              {group.links.map((link) =>
                link.to ? (
                  <li key={link.label}>
                    <RouterLink
                      to={link.to}
                      className="group inline-flex items-center gap-1.5 text-sm text-bone/70 hover:text-bone transition-colors"
                    >
                      <ArrowRight
                        size={12}
                        className="text-blood opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
                      />
                      {link.label}
                    </RouterLink>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-bone/70 hover:text-bone transition-colors"
                    >
                      <ArrowRight
                        size={12}
                        className="text-blood opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
                      />
                      {link.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Social + bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="w-9 h-9 flex items-center justify-center border border-white/15 text-bone/70 hover:bg-blood hover:border-blood hover:text-white transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/40 text-center sm:text-right">
            © {new Date().getFullYear()} BWF Media TV — All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
}
