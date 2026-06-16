import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — BWF Media TV" },
      { name: "description", content: "Terms governing use of BWF Network: artist profiles, memberships, studio bookings, media distribution, and platform features." },
      { property: "og:title", content: "Terms of Service — BWF Media TV" },
      { property: "og:description", content: "The terms that govern your use of the BWF Network platform and services." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate="June 15, 2026">
      <p>
        Welcome to BWF Media TV and BWF Network ("BWF," "Company," "we," "our," or "us"). These Terms of Service ("Terms")
        govern your access to and use of https://bwfnetwork.com and all related websites, applications, content, services,
        memberships, artist profiles, studio booking services, media distribution services, and features (collectively, the
        "Services"). By accessing or using the Services, you agree to be bound by these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old to create an account or purchase services. Minors may use the Services only with parental consent and supervision.</p>

      <h2>2. Accounts</h2>
      <p>You agree to provide accurate information, keep credentials secure, maintain updated account information, and accept responsibility for activities under your account. We may suspend or terminate accounts that contain false information or violate these Terms.</p>

      <h2>3. Artist Profiles and User Content</h2>
      <p>The Platform allows artists, creators, businesses, and users to upload music, videos, images, artwork, promotional materials, profile information, comments, and other media. You retain ownership of content you upload.</p>
      <p>By submitting content, you grant BWF a worldwide, non-exclusive, royalty-free license to display, host, stream, publish, promote, reproduce, and distribute such content in connection with operating and promoting the Services. This license remains in effect until content is removed, except where legal obligations require retention.</p>

      <h2>4. Content Ownership and Intellectual Property</h2>
      <p>All BWF content — logos, branding, website design, graphics, software, text, audio, video, and databases — is owned by or licensed to BWF and protected by applicable intellectual property laws. You may not copy, reproduce, distribute, modify, or exploit Company content without prior written permission.</p>

      <h2>5. Copyright Complaints (DMCA)</h2>
      <p>If you believe content on the Platform infringes your copyright, submit a notice to our Copyright Agent at <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a> containing identification of the work and infringing material, your contact information, a good-faith statement, and a statement under penalty of perjury. We reserve the right to remove infringing material and terminate repeat infringers.</p>

      <h2>6. Prohibited Conduct</h2>
      <ul>
        <li>Violating any law</li>
        <li>Uploading content you do not own or infringing IP rights</li>
        <li>Uploading malicious code or attempting unauthorized access</li>
        <li>Harassing, threatening, or impersonating others</li>
        <li>Publishing defamatory content or distributing spam</li>
        <li>Engaging in fraudulent activity</li>
      </ul>

      <h2>7. User Representations</h2>
      <p>You represent that you own or control all rights necessary to publish the content, that the content does not violate any law or third-party rights, and that you have obtained necessary permissions and releases.</p>

      <h2>8. Studio Booking Services</h2>
      <p>BWF may offer recording sessions, production services, media production, photography, videography, studio rentals, and consulting. All bookings are subject to separate agreements, estimates, schedules, and pricing. Failure to appear for scheduled sessions may result in forfeiture of deposits.</p>

      <h2>9. Payments</h2>
      <p>Prices are subject to change and applicable taxes may apply. We reserve the right to refuse or cancel transactions where fraud or unauthorized activity is suspected.</p>

      <h2>10. Membership Services</h2>
      <p>Membership benefits, pricing, and features may change at any time. We reserve the right to modify, suspend, or discontinue membership programs with or without notice.</p>

      <h2>11. Third-Party Services</h2>
      <p>We do not control and are not responsible for third-party content, policies, products, or services. Use of third-party services is at your own risk.</p>

      <h2>12. Termination</h2>
      <p>We may suspend or terminate access for violations, fraud, security concerns, or legal compliance. Upon termination, your right to use the Services immediately ends.</p>

      <h2>13. Disclaimer of Warranties</h2>
      <p>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, BWF DISCLAIMS ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, AND AVAILABILITY.</p>

      <h2>14. Limitation of Liability</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BWF SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION. IN NO EVENT SHALL BWF'S TOTAL LIABILITY EXCEED THE AMOUNT PAID BY THE USER TO BWF DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.</p>

      <h2>15. Indemnification</h2>
      <p>You agree to defend, indemnify, and hold harmless BWF, its officers, employees, contractors, affiliates, and partners from any claims arising from your use of the Services, your content, or violation of these Terms.</p>

      <h2>16. Governing Law</h2>
      <p>These Terms shall be governed by the laws of the State of Alabama, without regard to conflict of law principles. Any dispute shall be brought exclusively in the state or federal courts located in Alabama.</p>

      <h2>17. Arbitration</h2>
      <p>At BWF's election, disputes may be resolved through binding arbitration rather than court proceedings, except where prohibited by law.</p>

      <h2>18. Electronic Communications</h2>
      <p>By using the Services, you consent to receive service notifications, account notices, legal notices, and marketing communications (where permitted) electronically.</p>

      <h2>19. Changes to These Terms</h2>
      <p>We may modify these Terms at any time. Updated Terms will be posted with a revised Effective Date. Continued use of the Services constitutes acceptance.</p>

      <h2>20. Contact Information</h2>
      <p>BWF Media TV / BWF Network<br />Website: https://bwfnetwork.com<br />Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a></p>
    </LegalPage>
  );
}