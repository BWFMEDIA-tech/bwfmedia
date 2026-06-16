import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/artist-submission")({
  head: () => ({
    meta: [
      { title: "Artist Submission Terms — BWF Media TV" },
      { name: "description", content: "Terms for artists submitting music, videos, and promotional materials to BWF Network." },
    ],
  }),
  component: ArtistSubmissionPage,
});

function ArtistSubmissionPage() {
  return (
    <LegalPage title="Artist Submission Terms" effectiveDate="June 15, 2026">
      <p>By submitting music, videos, images, promotional materials, or other content ("Submission") to BWF Media TV ("BWF") for consideration, review, placement, interview, or promotion, you agree to these Artist Submission Terms.</p>

      <h2>1. Ownership and Rights</h2>
      <p>You represent that you own or control all rights necessary to submit the material, including master recording, composition, sync, performance, and likeness rights. You retain ownership of your Submission.</p>

      <h2>2. License to BWF</h2>
      <p>You grant BWF a non-exclusive, worldwide, royalty-free license to review, evaluate, stream, broadcast, display, excerpt, and promote the Submission in connection with the Services and BWF's promotional channels (including social media, the platform, and partner placements).</p>

      <h2>3. No Obligation</h2>
      <p>BWF is under no obligation to publish, promote, review, or respond to any Submission. Submission does not guarantee placement, airplay, interview, or promotion.</p>

      <h2>4. Paid Submissions</h2>
      <p>Where paid review, placement, or promotional services are offered, fees are non-refundable once the review or placement service has begun unless otherwise stated in the offering.</p>

      <h2>5. Clearances</h2>
      <p>You are solely responsible for obtaining and paying for all licenses, clearances, and releases (including for samples, features, producers, and on-camera participants).</p>

      <h2>6. Removal</h2>
      <p>You may request removal of your Submission at any time by emailing us. BWF will remove the Submission within a commercially reasonable period.</p>

      <h2>7. Indemnification</h2>
      <p>You agree to indemnify BWF against any claims arising from your Submission, including claims of infringement, defamation, or violation of third-party rights.</p>

      <h2>8. Contact</h2>
      <p>Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a></p>
    </LegalPage>
  );
}