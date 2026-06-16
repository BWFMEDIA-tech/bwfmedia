import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — BWF Media TV" },
      { name: "description", content: "How BWF Media TV uses cookies and similar tracking technologies across the platform." },
    ],
  }),
  component: CookiePage,
});

function CookiePage() {
  return (
    <LegalPage title="Cookie Policy" effectiveDate="June 15, 2026">
      <p>This Cookie Policy explains how BWF Media TV ("BWF") uses cookies and similar tracking technologies when you visit our Services.</p>

      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files stored on your device when you visit a website. They allow the site to recognize your device, remember preferences, and improve your experience.</p>

      <h2>2. Types of Cookies We Use</h2>
      <h3>Strictly Necessary</h3>
      <p>Required for core functionality such as authentication, session management, security, and payment processing. These cannot be disabled.</p>
      <h3>Functional</h3>
      <p>Remember your preferences (e.g. playback settings, theme) to personalize your experience.</p>
      <h3>Analytics</h3>
      <p>Help us understand how users interact with the platform so we can improve performance, content, and features.</p>
      <h3>Marketing</h3>
      <p>Used to measure the effectiveness of campaigns and, where applicable, to show relevant advertising on third-party platforms.</p>

      <h2>3. Third-Party Cookies</h2>
      <p>We may allow trusted third parties (such as analytics providers, payment processors, and embedded video/audio players) to set cookies for the purposes described above. Their use of cookies is governed by their own privacy and cookie policies.</p>

      <h2>4. Managing Cookies</h2>
      <p>Most browsers let you refuse or delete cookies through their settings. Disabling certain cookies may affect the functionality of the Services, including the ability to sign in or complete purchases.</p>

      <h2>5. Do Not Track</h2>
      <p>Some browsers offer a "Do Not Track" signal. There is no industry standard for responding to these signals, and we currently do not respond to them.</p>

      <h2>6. Changes</h2>
      <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with a revised Effective Date.</p>

      <h2>7. Contact</h2>
      <p>Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a></p>
    </LegalPage>
  );
}