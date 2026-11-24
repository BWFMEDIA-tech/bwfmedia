interface PrivacySection { title: string; paragraphs: string[]; links?: { label: string; href: string }[]; }

export const PRIVACY_UPDATED = "November 24, 2026";
export const PRIVACY_INTRO = "Tunevio (https://tunevio.com) provides music streaming, artist profiles, live audio and video, artist battles, messaging, creator tools, merchandise and booking services. This policy explains how information is handled on our website and related applications. Contact tunevioapp@gmail.com with privacy questions or requests.";
export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    "title": "1. Information you provide",
    "paragraphs": [
      "We collect information you submit to create and use an account: name, email address, sign-in information, username, profile photos, biography, artist details, preferences and membership status. Depending on the services you use, this can include contact and shipping details, booking requests, rights information, payout details, messages, comments, reports, music, videos, artwork and other uploaded content."
    ]
  },
  {
    "title": "2. Activity and technical information",
    "paragraphs": [
      "We process listening and playback activity, saved music, follows, likes, votes, live participation and service interactions to operate Tunevio. Account-linked activity may support recommendations, artist analytics and royalty calculations. Security and operational processing can include IP addresses, browser/device information, approximate country, request logs, errors and fraud or abuse signals. Tunevio does not provide live location sharing or require access to your precise device location."
    ]
  },
  {
    "title": "3. Device permissions and notifications",
    "paragraphs": [
      "Camera and microphone access is used when you choose to publish live video or audio or join a performing role in a stage or battle. Selected photos and media support profiles, artwork and content publishing. Access depends on permissions available on your platform; you can revoke them in device or browser settings. Declining a permission can prevent the corresponding feature from working.",
      "When you opt in to push notifications, we store the delivery subscription and preferences needed to send them through your browser or device push service. Permission descriptions in the iPhone project do not automatically grant access to your entire photo library."
    ]
  },
  {
    "title": "4. Why we use information",
    "paragraphs": [
      "We use information to provide accounts, playback, live sessions and social features; publish content you choose to share; process transactions, bookings and creator earnings; send service communications; personalize your experience; maintain safety; respond to reports and rights disputes; prevent fraud; improve reliability; and meet legal and accounting obligations.",
      "Where applicable, processing is based on providing services you request, legitimate interests such as security and service improvement, legal obligations, or consent for optional activities. You may withdraw consent where processing depends on it, without affecting processing already carried out."
    ]
  },
  {
    "title": "5. Public content and private communications",
    "paragraphs": [
      "Profile names, photos, biographies, artist details and featured media are publicly discoverable. Music, videos, comments and live performances you publish may be seen, heard or shared by others. Do not publish information you want to keep private. Other participants may capture public content outside our control.",
      "Direct messages are available to their participants; authorized personnel may access relevant information to address reports, support, safety or legal obligations. Safety reports and block lists are not public. Moderation may retain reported-content evidence as needed to investigate abuse. Live media is transmitted to authorized participants; recordings created through recording features are handled as separate stored content."
    ]
  },
  {
    "title": "6. Storage and embedded services",
    "paragraphs": [
      "Tunevio uses browser or app storage for sign-in sessions, preferences, installation choices, playback-related state and cached resources. Sign-in tokens and account information are different from anonymous visitor counting. Clearing storage or disabling necessary cookies may sign you out or affect features.",
      "Embedded YouTube videos and linked services can receive IP/device information and activity when they load or are used, and may use their own cookies or identifiers. Google Fonts receives network information when fonts load. External services apply their own privacy policies."
    ],
    "links": [
      {
        "label": "Google privacy policy",
        "href": "https://policies.google.com/privacy"
      }
    ]
  },
  {
    "title": "7. Lovable visitor analytics",
    "paragraphs": [
      "Lovable collects visitor analytics for us on the published site. This counting uses no cookies, stores nothing on your device, does not keep IP addresses and does not identify visitors. It records pages visited, referral sources, country, browser, operating system, device type, time on site, page-load performance and errors. Click tracking is enabled and records button and link clicks. Detailed data is kept for 90 days and daily summaries for one year.",
      "The current site does not pass an analytics choice through a consent banner, so this activity is recorded for every visitor. This does not describe the separate Meta advertising tools below or account-linked Tunevio activity. Lovable collects this data for us. Lovable’s privacy policy explains how it handles it."
    ],
    "links": [
      {
        "label": "Lovable’s privacy policy",
        "href": "https://lovable.dev/privacy"
      }
    ]
  },
  {
    "title": "8. Meta advertising measurement",
    "paragraphs": [
      "The website currently loads the Meta Pixel, including page-view measurement and selected marketing interactions. Meta may receive visited-page details, IP addresses, browser/device information and cookies or other identifiers, and may associate activity with a Meta account. This is separate from Lovable’s anonymous visitor analytics.",
      "Browser privacy controls and tracking prevention may limit some collection. The current website does not provide a dedicated consent banner for Meta. Permission handling in a released iPhone app may differ; Apple tracking permission is required where Apple’s tracking rules apply. This policy does not claim that a tracking permission or consent mechanism has already been implemented."
    ],
    "links": [
      {
        "label": "Meta privacy policy",
        "href": "https://www.facebook.com/privacy/policy/"
      }
    ]
  },
  {
    "title": "9. Providers, AI and payments",
    "paragraphs": [
      "Lovable Cloud provides hosting, account authentication, data storage and related services. LiveKit infrastructure carries live audio/video and connection information. Lovable-managed email and push services process destinations and message content. When used, the AI assistant sends submitted conversations and relevant platform context through Lovable’s AI service to its model provider. Tunevio stores assistant history and support-related questions. Do not send passwords, payment credentials or sensitive personal information to the assistant.",
      "Stripe processes supported web payments and payout-related information. Shopify or artist-hosted stores may handle merchandise checkout when you choose those services. Tunevio receives transaction references, status and information needed to fulfill orders and account for earnings; payment providers handle card processing. The consumption-first native iPhone launch does not offer digital purchase checkout; web billing and existing entitlements remain separate.",
      "Providers receive information needed for their functions. We may disclose information for lawful requests, rights and safety, disputes or a business transfer. Providers may have separate retention practices."
    ],
    "links": [
      {
        "label": "Stripe privacy policy",
        "href": "https://stripe.com/privacy"
      },
      {
        "label": "Shopify privacy policy",
        "href": "https://www.shopify.com/legal/privacy"
      },
      {
        "label": "LiveKit privacy policy",
        "href": "https://livekit.io/privacy-policy"
      }
    ]
  },
  {
    "title": "10. Retention and account deletion",
    "paragraphs": [
      "We keep information as needed to provide the service, maintain safety, resolve disputes and comply with obligations. Request account deletion inside Tunevio at Settings → Security → Delete Account. Deletion removes account access and initiates removal of associated profile content and stored files, subject to legitimate retention requirements. Copies made by other people may remain outside our control.",
      "Payment and artist earnings records are retained for seven years after account deletion. Unpaid earnings and the financial references needed to settle them are protected rather than erased. This does not authorize retaining unrelated personal content or leaving the account accessible. Limited deletion receipts document the request and required financial retention.",
      "Provider-held records, legal holds, reported-content evidence, suppression records and necessary operational records may follow separate retention requirements. Contact us about a particular record or request. We do not promise immediate removal of independently held copies."
    ]
  },
  {
    "title": "11. Your choices and privacy rights",
    "paragraphs": [
      "You can update account/profile settings, manage notifications, use marketing unsubscribe links, revoke device permissions, report content, block users and delete your account. Depending on your location and applicable law, rights may include access, correction, deletion, portability, restriction or objection to processing, withdrawing consent, and requests about advertising-related sharing.",
      "Send requests to tunevioapp@gmail.com. We may verify identity and retain information where law permits or requires it. You may contact your privacy regulator. Rights and exceptions differ by jurisdiction; this policy does not determine which laws apply to Tunevio."
    ]
  },
  {
    "title": "12. Children and age requirements",
    "paragraphs": [
      "Tunevio is not directed to children under 13, and we do not knowingly collect personal information from children under 13. Current Terms require users to be at least 18 to create an account or purchase services; minors may use the Services only with parental consent and supervision. Tunevio does not currently provide verified age assurance or a parent-management dashboard. Contact us if you believe a child has supplied personal information."
    ]
  },
  {
    "title": "13. Security and international processing",
    "paragraphs": [
      "We use access controls and other reasonable measures to protect information, but no online system is completely secure. Information may be processed in the United States or other countries where providers operate. Where applicable, legally required transfer safeguards should govern that processing; contact us for information about your request."
    ]
  },
  {
    "title": "14. Contact and changes",
    "paragraphs": [
      "Contact Tunevio at tunevioapp@gmail.com or https://tunevio.com/contact. Material changes will be posted with an updated date and additional notice where required. This policy describes current practices; permissions and disclosures must also be reviewed in the specific app version you install."
    ]
  }
];
