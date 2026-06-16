import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — BWF Media TV" },
      { name: "description", content: "Refund and cancellation terms for BWF Media TV studio bookings, memberships, and digital services." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" effectiveDate="June 15, 2026">
      <p>This Refund Policy applies to bookings, memberships, and paid services purchased through BWF Media TV ("BWF").</p>

      <h2>1. Studio Bookings</h2>
      <ul>
        <li><strong>Deposits</strong> are required to secure session dates and are non-refundable.</li>
        <li><strong>Cancellations</strong> made at least 72 hours before the session may be rescheduled once at no charge, subject to availability.</li>
        <li><strong>Cancellations</strong> made within 72 hours of the session forfeit the deposit.</li>
        <li><strong>No-shows</strong> forfeit all amounts paid for the session.</li>
        <li><strong>BWF cancellations</strong> due to equipment, staffing, or facility issues will be refunded in full or rescheduled at the client's option.</li>
      </ul>

      <h2>2. Memberships and Subscriptions</h2>
      <ul>
        <li>Recurring subscriptions may be cancelled at any time and will remain active through the end of the current billing cycle.</li>
        <li>Subscription fees already charged are non-refundable except where required by law.</li>
        <li>Free trials convert to paid subscriptions automatically unless cancelled before the trial ends.</li>
      </ul>

      <h2>3. Digital Goods and Services</h2>
      <p>Digital products, downloads, paid submissions, paid promotional placements, ad credits, and virtual gifts are non-refundable once delivered or activated.</p>

      <h2>4. Merchandise</h2>
      <p>Physical merchandise may be returned within 14 days of delivery if unused and in original condition. Buyer is responsible for return shipping. Custom or print-on-demand items are final sale.</p>

      <h2>5. Disputes and Chargebacks</h2>
      <p>Please contact us before initiating a chargeback. Unsubstantiated chargebacks may result in account suspension and a chargeback fee.</p>

      <h2>6. How to Request a Refund</h2>
      <p>Email <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a> with your order number, the reason for the refund, and any supporting information. Eligible refunds are processed within 7–14 business days.</p>
    </LegalPage>
  );
}