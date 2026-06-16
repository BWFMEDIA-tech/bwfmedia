import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Policy — BWF Media TV" },
      { name: "description", content: "How to submit copyright infringement notices and counter-notices to BWF Media TV under the DMCA." },
    ],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  return (
    <LegalPage title="DMCA Policy" effectiveDate="June 15, 2026">
      <p>BWF Media TV ("BWF") respects the intellectual property rights of others and expects the same of its users. This DMCA Policy explains how to notify us of alleged copyright infringement on the Services in accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512).</p>

      <h2>1. Filing a DMCA Takedown Notice</h2>
      <p>If you believe that content on the Platform infringes your copyright, send a written notice to our Designated Copyright Agent that includes:</p>
      <ul>
        <li>A physical or electronic signature of the copyright owner or authorized agent</li>
        <li>Identification of the copyrighted work claimed to have been infringed</li>
        <li>Identification of the allegedly infringing material and information sufficient to locate it (URL)</li>
        <li>Your contact information (name, address, telephone, email)</li>
        <li>A statement that you have a good-faith belief that the use is not authorized by the copyright owner, agent, or law</li>
        <li>A statement, made under penalty of perjury, that the information is accurate and that you are authorized to act on behalf of the copyright owner</li>
      </ul>

      <h2>2. Counter-Notification</h2>
      <p>If you believe content was removed in error, you may submit a counter-notification containing your signature, identification of the removed material and its location, a statement under penalty of perjury that the removal was a mistake or misidentification, and your consent to the jurisdiction of the federal court in Alabama.</p>

      <h2>3. Repeat Infringers</h2>
      <p>BWF will terminate the accounts of users determined, in our sole discretion, to be repeat infringers.</p>

      <h2>4. False Claims</h2>
      <p>Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing — or was removed by mistake — may be liable for damages.</p>

      <h2>5. Designated Copyright Agent</h2>
      <p>Copyright Agent<br />BWF Media TV<br />Email: <a href="mailto:bookings@bwfmedia.company">bookings@bwfmedia.company</a></p>
    </LegalPage>
  );
}