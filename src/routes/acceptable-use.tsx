import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable Use Policy & Terms of Service — Tunevio" },
      { name: "description", content: "The rules for using Tunevio: prohibited content, creator responsibilities, reporting, enforcement, payments, and appeals." },
      { property: "og:title", content: "Acceptable Use Policy & Terms of Service — Tunevio" },
      { property: "og:description", content: "The rules that apply when accessing or using Tunevio, uploading content, participating in live streams and battles, and receiving payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable Use Policy & Terms of Service" effectiveDate="October 20, 2026">
      <p>
        Tunevio is a music streaming, artist-discovery, live-streaming and creator-engagement platform that connects
        independent artists, music creators, listeners and fans.
      </p>
      <p>
        This Acceptable Use Policy and Terms of Service ("Policy") explains the rules that apply when accessing or
        using Tunevio, uploading or sharing content, participating in live streams and artist battles, purchasing
        digital goods, subscribing to services, or receiving payments through the platform.
      </p>
      <p>
        By creating an account or using Tunevio, you agree to comply with this Policy. Violations may result in
        content removal, demonetisation, suspension or termination of your account.
      </p>

      <h2>1. Prohibited Content and Activities</h2>
      <p>
        Tunevio prohibits the upload, distribution, promotion, sale or monetisation of content or services that
        violate applicable laws or this Policy. The following content is prohibited from monetisation and, where
        appropriate, from being hosted or distributed on Tunevio.
      </p>

      <h3>1.1 Adult Content and Services</h3>
      <p>
        Users may not upload, sell, distribute or monetise pornography, sexually explicit material, content depicting
        explicit sexual acts, or adult sexual services. This restriction includes subscriber-only content, paid live
        streams and other paid-access formats.
      </p>

      <h3>1.2 Copyright and Intellectual Property Infringement</h3>
      <p>
        Users must own or have all necessary rights, licences, permissions and consents to upload, distribute, stream
        or monetise their content. Prohibited activities include:
      </p>
      <ul>
        <li>Uploading leaked albums, unauthorised recordings or copyrighted music without permission.</li>
        <li>Distributing music, videos, artwork or other content in violation of copyright or intellectual property rights.</li>
        <li>Impersonating an artist or falsely claiming ownership of another person's work.</li>
        <li>Circumventing copyright restrictions or repeatedly uploading content previously removed for infringement.</li>
        <li>Using Tunevio to sell or monetise content without the necessary rights.</li>
      </ul>
      <p>
        Tunevio may remove disputed content, restrict monetisation or suspend access while investigating a credible
        rights complaint.
      </p>

      <h3>1.3 Violent Extremism and Hate Speech</h3>
      <p>
        Users may not upload, promote or monetise content that engages in, encourages, promotes or celebrates unlawful
        violence or violent extremism. Content that promotes or celebrates hatred, discrimination or violence against
        individuals or groups based on race, religion, disability, gender, sexual orientation, national origin or
        other protected or immutable characteristics is prohibited.
      </p>

      <h3>1.4 Illegal and Harmful Activities</h3>
      <p>
        Users may not use Tunevio to facilitate fraud, scams, money laundering, trafficking, exploitation, threats,
        harassment, unauthorised access to accounts or other unlawful activities.
      </p>

      <h3>1.5 Fraud, Manipulation and Platform Abuse</h3>
      <ul>
        <li>Artificial streams, bot activity, fake engagement or manipulated listening statistics.</li>
        <li>Vote manipulation, fraudulent artist battles or attempts to falsify competition results.</li>
        <li>Payment fraud, chargeback abuse or attempts to obtain unauthorised payouts.</li>
        <li>Spam, deceptive promotions, impersonation or misleading financial claims.</li>
        <li>Attempts to exploit platform features to generate illegitimate earnings or evade enforcement.</li>
      </ul>

      <h3>1.6 Harassment and Abusive Conduct</h3>
      <p>
        Users may not threaten, stalk, dox, intimidate or repeatedly harass other users. Live chats, artist battles,
        comments, profiles and private communications must comply with this Policy.
      </p>

      <h2>2. Creator Responsibilities</h2>
      <p>
        Artists, hosts, labels and other creators are responsible for the content they upload and the rights
        associated with it. By submitting content, you confirm that:
      </p>
      <ul>
        <li>You own the content or have the necessary permissions to use and monetise it.</li>
        <li>Your uploads do not knowingly infringe another party's rights.</li>
        <li>You have obtained any required permissions from collaborators, performers, producers and other rights holders.</li>
        <li>Your metadata, ownership claims and payment information are accurate.</li>
        <li>You will respond appropriately to legitimate rights disputes and requests for clarification.</li>
      </ul>
      <p>Tunevio does not guarantee that uploaded content will remain available or eligible for monetisation.</p>

      <h2>3. Reporting Violations</h2>
      <p>
        Tunevio provides a process for users, artists, rights holders and other affected parties to report content or
        activity that may violate this Policy. Reports should identify the relevant content and explain the suspected
        violation. Where possible, include:
      </p>
      <ul>
        <li>The URL or direct link to the relevant profile, track, video, live stream or other content.</li>
        <li>The nature of the alleged violation.</li>
        <li>Supporting information or evidence.</li>
        <li>For copyright complaints, identification of the protected work and an explanation of the rights claimed.</li>
        <li>Contact details sufficient for Tunevio to request clarification when necessary.</li>
      </ul>
      <p>
        Reports should be submitted through Tunevio's available in-platform reporting functionality or by emailing{" "}
        <a href="mailto:tunevioapp@gmail.com">tunevioapp@gmail.com</a>.
      </p>
      <p>
        Users must provide truthful information. Knowingly submitting false or misleading reports may result in
        account restrictions.
      </p>

      <h2>4. Content Review and Takedown Process</h2>
      <p>
        When Tunevio receives a report, we may review the reported material, available evidence, account history and
        applicable policies. Depending on the circumstances, Tunevio may:
      </p>
      <ul>
        <li>Assess the report and request additional information.</li>
        <li>Temporarily restrict access to disputed content or suspend monetisation while a serious complaint is investigated.</li>
        <li>Remove content confirmed to violate this Policy or applicable law.</li>
        <li>Restrict uploads, live-streaming, messaging, payments or other account functionality when appropriate.</li>
        <li>Notify affected users where appropriate and legally permitted.</li>
        <li>Maintain records of reports, decisions and enforcement actions.</li>
      </ul>
      <p>
        The timing and outcome of a review depend on the nature, urgency and completeness of the report. Tunevio may
        act without prior notice when necessary to protect users, comply with legal obligations or prevent serious
        harm. Submitting a report does not guarantee removal. Tunevio evaluates reports based on available evidence
        and applicable requirements.
      </p>

      <h2>5. Copyright Complaints and Counter-Notifications</h2>
      <p>
        Copyright holders or their authorised representatives may submit notices concerning content they believe
        infringes their rights. A copyright notice should identify the copyrighted work, the allegedly infringing
        material, its location on Tunevio, the complainant's contact details and the required declarations of
        authority and good faith. Where applicable law requires additional information, that information must also be
        provided.
      </p>
      <p>
        Tunevio may remove or disable access to the disputed material, restrict monetisation and notify the uploader.
        Where legally appropriate, affected users may submit a counter-notification or dispute the complaint through
        the designated process. Tunevio may restore material when appropriate under applicable law and after reviewing
        a valid counter-notification or other relevant evidence.
      </p>
      <p>
        Copyright contact: <a href="mailto:tunevioapp@gmail.com">tunevioapp@gmail.com</a>
      </p>

      <h2>6. Repeat Violations and Account Enforcement</h2>
      <p>
        Tunevio maintains a policy against repeat violations of this Policy and its Terms of Service. Depending on the
        seriousness, frequency and circumstances of a violation, enforcement may include:
      </p>
      <ul>
        <li>A warning or request to correct the violation.</li>
        <li>Removal or restriction of content.</li>
        <li>Suspension or loss of monetisation privileges.</li>
        <li>Temporary restrictions on uploads, live streams, battles or other platform features.</li>
        <li>Suspension of an account.</li>
        <li>Permanent account termination for repeated, serious or intentional violations.</li>
      </ul>
      <p>
        Serious violations, including credible threats, unlawful exploitation, deliberate fraud or significant
        copyright infringement, may result in immediate restrictions or termination without a prior warning. Tunevio
        may consider account history, previous notices, attempts to evade enforcement and the severity of the conduct
        when determining appropriate action. Users whose accounts are terminated may not create replacement accounts
        to evade enforcement.
      </p>

      <h2>7. Creator Payments and Stripe Connect</h2>
      <p>
        Tunevio may use Stripe Connect or other authorised payment services to facilitate eligible payments to
        creators. Creators who receive payments may be required to complete identity verification, provide accurate
        account and banking information, accept applicable payment-provider terms and satisfy eligibility
        requirements.
      </p>
      <p>
        Payments, transfers and payouts are subject to verification, platform rules, payment-provider requirements,
        applicable law and the availability of cleared funds. Tunevio may suspend or withhold affected payments or
        monetisation where reasonably necessary to investigate suspected fraud, resolve a payment dispute, address a
        rights complaint or comply with legal or payment-provider requirements.
      </p>
      <p>
        No creator is guaranteed earnings, a particular payout amount or uninterrupted access to monetisation
        features. Creators must not use Tunevio's payment features to sell prohibited content, facilitate illegal
        transactions or evade applicable payment-provider restrictions.
      </p>

      <h2>8. Digital Goods, Subscriptions, Tips and Promotions</h2>
      <p>
        Where available, Tunevio may offer subscriptions, digital goods, promotional features, artist-support
        payments, tips, merchandise and other creator-related transactions. Users must accurately represent what they
        are selling or purchasing. Transactions must comply with this Policy and any additional terms presented at
        checkout.
      </p>
      <p>
        Purchases, cancellations, refunds and disputes are subject to the applicable transaction terms,
        payment-provider rules and consumer-protection law. Tunevio may disable a transaction type or restrict an
        account where continued activity creates unacceptable legal, financial or platform risk.
      </p>

      <h2>9. Moderation and Enforcement Limitations</h2>
      <p>
        Tunevio may use user reports, administrative review, technical safeguards and other appropriate methods to
        identify and address policy violations. Tunevio does not guarantee that every violation will be detected
        before content is published or monetised. Users should report suspected violations through the designated
        reporting process. Nothing in this section limits Tunevio's ability to remove content, restrict monetisation
        or suspend accounts when permitted by this Policy and applicable law.
      </p>

      <h2>10. Appeals and Review Requests</h2>
      <p>
        Users affected by content removal, demonetisation or account restrictions may request a review through
        Tunevio's designated support or appeal channel, where available. Requests should identify the relevant
        decision, explain why the user believes it was incorrect and provide supporting evidence. Tunevio may
        reconsider a decision when new information or a clear error is identified. Repeated or abusive appeals may be
        restricted.
      </p>

      <h2>11. Privacy and Information Handling</h2>
      <p>
        Tunevio may process information associated with reports, moderation decisions, account activity, transactions
        and payment verification for platform safety, fraud prevention, dispute resolution and legal compliance.
        Personal information is handled in accordance with Tunevio's applicable privacy policy and legal obligations.
        Users should avoid including unnecessary sensitive personal information in reports.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        Tunevio may update this Policy to reflect changes to platform features, legal requirements, payment-provider
        rules or safety practices. The updated version will be published on the platform with a revised effective date
        where appropriate. Continued use after changes take effect constitutes acceptance to the extent permitted by
        applicable law.
      </p>

      <h2>13. Contact and Legal Notices</h2>
      <p>
        For questions concerning this Policy, content reports, copyright complaints or enforcement decisions, contact
        Tunevio through the reporting and support channels published on the platform.
      </p>
      <p>
        Platform: Tunevio
        <br />
        Website: <a href="https://tunevio.com">https://tunevio.com</a>
        <br />
        Operator: Tunevio
        <br />
        Support contact: <a href="mailto:tunevioapp@gmail.com">tunevioapp@gmail.com</a>
      </p>

      <p>
        <strong>
          By using Tunevio, users agree to comply with this Acceptable Use Policy and Terms of Service. Violations may
          result in content removal, demonetisation, account restrictions or termination.
        </strong>
      </p>
    </LegalPage>
  );
}
