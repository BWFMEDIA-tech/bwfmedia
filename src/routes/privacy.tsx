import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from '@/lib/privacy-policy';

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Tunevio" },
      { name: "description", content: "Tunevio privacy practices for accounts, music, live media, advertising, payments and account deletion." },
      { property: "og:title", content: "Privacy Policy — Tunevio" },
      { property: "og:description", content: "How Tunevio handles information, device permissions, tracking and seven-year financial retention." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate={PRIVACY_UPDATED}>
      <p>{PRIVACY_INTRO}</p>
      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mb-4">{paragraph}</p>)}
          {section.links?.map((link) => <p key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></p>)}
        </section>
      ))}
    </LegalPage>
  );
}
