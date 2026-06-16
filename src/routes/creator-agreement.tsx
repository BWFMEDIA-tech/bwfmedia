import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/creator-agreement")({
  head: () => ({
    meta: [
      { title: "Creator Agreement — BWF Media TV" },
      { name: "description", content: "Terms governing creators who publish, monetize, and distribute content on BWF Network." },
    ],
  }),
  component: CreatorAgreementPage,
});

function CreatorAgreementPage() {
  return (
    <LegalPage title="Creator Agreement" effectiveDate="June 15, 2026">
      <p>This Creator Agreement ("Agreement") is entered into between BWF Media TV ("BWF") and any individual or entity ("Creator") who creates a profile, uploads content, monetizes work, or otherwise participates in the BWF Network platform.</p>

      <h2>1. Eligibility</h2>
      <p>Creators must be at least 18 years of age and legally able to enter into binding contracts in their jurisdiction.</p>

      <h2>2. Content License</h2>
      <p>Creator grants BWF a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, stream, distribute, promote, and create promotional excerpts of Creator Content in connection with operating and marketing the Services. Creator retains ownership of their content.</p>

      <h2>3. Creator Representations</h2>
      <ul>
        <li>Creator owns or controls all rights necessary to grant the licenses in this Agreement</li>
        <li>Content does not infringe any third-party rights, including copyright, trademark, publicity, or privacy</li>
        <li>Required releases, clearances, and sample licenses have been obtained</li>
        <li>Content complies with all applicable laws</li>
      </ul>

      <h2>4. Monetization</h2>
      <p>Where monetization features are offered (subscriptions, tips, ad revenue, sponsorships, merch), payouts are governed by separate payout terms. BWF may deduct platform fees, payment processor fees, taxes, refunds, and chargebacks before payout. Payout schedules and minimum thresholds may apply.</p>

      <h2>5. Prohibited Content</h2>
      <ul>
        <li>Unlicensed copyrighted material</li>
        <li>Hate speech, harassment, or threats</li>
        <li>Sexually explicit content involving minors</li>
        <li>Content that promotes illegal activity</li>
        <li>Spam or deceptive content</li>
      </ul>

      <h2>6. Exclusivity</h2>
      <p>Unless otherwise agreed in writing, this Agreement is non-exclusive and does not prevent Creator from distributing content on other platforms.</p>

      <h2>7. Termination</h2>
      <p>Either party may terminate this Agreement at any time. BWF may remove content and terminate Creator accounts for breach of this Agreement, the Terms of Service, or applicable law.</p>

      <h2>8. Taxes</h2>
      <p>Creator is solely responsible for any taxes owed on payments received through the platform and for providing accurate tax documentation when required.</p>

      <h2>9. Contact</h2>
      <p>Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a></p>
    </LegalPage>
  );
}