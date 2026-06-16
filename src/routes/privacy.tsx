import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BWF Media TV" },
      { name: "description", content: "How BWF Media TV collects, uses, and protects information across our artist platform, media network, and booking services." },
      { property: "og:title", content: "Privacy Policy — BWF Media TV" },
      { property: "og:description", content: "Our privacy practices for the BWF Network platform and services." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="June 15, 2026">
      <p>
        Welcome to BWF Media TV ("BWF," "we," "our," or "us"). This Privacy Policy explains how we collect, use,
        disclose, and protect information when you visit or use our website, services, artist platform, media network,
        booking services, and related applications (collectively, the "Services").
      </p>
      <p>By using our Services, you agree to the practices described in this Privacy Policy.</p>

      <h2>1. Information We Collect</h2>
      <h3>Information You Provide</h3>
      <ul>
        <li>Name, email address, username</li>
        <li>Artist or business profile information</li>
        <li>Phone number</li>
        <li>Booking inquiries and project details</li>
        <li>Messages sent through contact forms</li>
        <li>Content you upload, publish, or submit</li>
        <li>Payment and billing information (processed through third-party payment providers)</li>
      </ul>
      <h3>Account Information</h3>
      <ul>
        <li>Login credentials, profile information, account preferences, membership status</li>
      </ul>
      <h3>Automatically Collected Information</h3>
      <ul>
        <li>IP address, browser type, device information, operating system</li>
        <li>Referring URLs, pages viewed, time spent, usage analytics, cookie identifiers</li>
      </ul>

      <h2>2. Cookies and Tracking Technologies</h2>
      <p>We may use cookies, pixels, web beacons, analytics tools, and session storage technologies to operate the platform, improve performance, understand user behavior, personalize content, and measure marketing effectiveness. You may disable cookies through your browser settings, though some features may not function properly.</p>

      <h2>3. How We Use Information</h2>
      <ul>
        <li>Provide and maintain the Services</li>
        <li>Create and manage accounts</li>
        <li>Process bookings and inquiries</li>
        <li>Publish artist profiles and media content</li>
        <li>Communicate with users and send service-related notifications</li>
        <li>Improve platform functionality and detect fraud and abuse</li>
        <li>Enforce our Terms of Service and comply with legal obligations</li>
        <li>Market our services where permitted by law</li>
      </ul>

      <h2>4. User Content</h2>
      <p>Artists, creators, and users may submit videos, music, images, profiles, comments, and promotional materials. Information you choose to make public may be visible to other users. We are not responsible for how third parties use publicly available information.</p>

      <h2>5. Studio Bookings and Business Inquiries</h2>
      <p>When you submit booking requests or production inquiries, we may collect information necessary to respond, schedule services, provide estimates, fulfill contracted work, and maintain client records.</p>

      <h2>6. How We Share Information</h2>
      <h3>Service Providers</h3>
      <p>Hosting, analytics, email, payment processors, and customer support providers.</p>
      <h3>Legal Requirements</h3>
      <p>To comply with laws, respond to lawful requests, protect rights and safety, or investigate fraud or abuse.</p>
      <h3>Business Transfers</h3>
      <p>If BWF Media TV is involved in a merger, acquisition, financing, or sale of assets, information may be transferred as part of that transaction.</p>

      <h2>7. Data Retention</h2>
      <p>We retain information for as long as reasonably necessary to provide Services, maintain business records, resolve disputes, enforce agreements, and comply with legal obligations.</p>

      <h2>8. Data Security</h2>
      <p>We implement reasonable administrative, technical, and organizational safeguards. No internet transmission or storage system is completely secure, and we cannot guarantee absolute security.</p>

      <h2>9. Third-Party Links and Services</h2>
      <p>Our Services may contain links to third-party websites, social platforms, streaming services, or partner services. We are not responsible for the privacy practices of those third parties.</p>

      <h2>10. Children's Privacy</h2>
      <p>The Services are not directed toward children under 13. We do not knowingly collect personal information from children under 13.</p>

      <h2>11. California Privacy Rights</h2>
      <p>California residents may have rights to know what personal information is collected, request deletion, correct inaccuracies, and request access. Contact us using the information below to exercise these rights.</p>

      <h2>12. International Users</h2>
      <p>If you access the Services from outside the United States, your information may be transferred to and processed in the United States or other jurisdictions.</p>

      <h2>13. Your Choices</h2>
      <ul>
        <li>Update account information and modify profile settings</li>
        <li>Opt out of marketing emails</li>
        <li>Request account deletion where applicable</li>
        <li>Control cookies through browser settings</li>
      </ul>

      <h2>14. Contact Us</h2>
      <p>BWF Media TV<br />Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a><br />Website: bwfnetwork.com</p>

      <h2>15. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy periodically. Changes will be posted with an updated Effective Date. Continued use of the Services constitutes acceptance of the revised Privacy Policy.</p>
    </LegalPage>
  );
}