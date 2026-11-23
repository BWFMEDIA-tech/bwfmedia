# Tunevio App Store preparation status

## Implemented
- Apple sign-in enabled in Lovable Cloud and added to member login and signup using the existing managed sign-in helper.
- Official Apple logo assets copied unchanged from Apple Design Resources into the source asset folder.
- Existing Google and email sign-in, account/profile lifecycle, and safe login return behavior retained.
- Capacitor configuration now opens HTTPS production rather than the editor preview; insecure connections are disabled.

## Verified in the web app
- 13 account-access/social-continuation regression tests passed, including provider errors, missing/invalid sessions, external return URLs and safe existing-account navigation.
- Login/signup provider buttons and official logos were visually inspected at 320, 390 and 1280px; content fits without horizontal overflow, and the intro no longer obscures the captured checks.
- A disposable authenticated member returned from login to Home and saw existing-profile continuation on signup, not another registration form. Its profile count remained exactly one before and after the checks. No existing customer's account was modified.
- Latest preview build reports `build OK`. A complete Apple-provider login/callback, native sign-in, and physical iPhone behavior remain unverified.

## Account deletion safety finding — unresolved
The owner confirmed that payment and artist earnings records must be retained for seven years after account deletion. The retention duration is no longer an open question; complete the dependency audit and protected archival/removal flow before enabling deletion.

Do not call `auth.admin.deleteUser` against an existing Tunevio account yet. The live schema has cascading account references in subscriptions, payout requests, merchandise commissions, memberships, streams, and stage rooms. Deleting an account could delete payment/payout history and indirectly delete stream-associated earnings; battle participant references can also prevent deletion. Tracks use `SET NULL`, which would leave attributed published content after account removal unless explicitly removed.

A production deletion flow must first establish the legally required financial retention policy and perform a complete dependency/storage audit. It must cancel recurring agreements through the payment provider, preserve payable earnings and required audit records, remove or anonymize non-required personal data, clean uploaded storage through its API, then delete only the server-verified caller's auth account. Apple revocation must be offered after successful account deletion using the managed `/~oauth/apple/revoke` flow. No account-deletion button or completed-account claim has been added while these safeguards are unresolved.

## Review safeguards audited
- Live moderation exists: host/moderator message removal, timeouts, user bans, and banned-word filtering.
- Music-rights administration and user ownership declarations exist; this does not establish Tunevio's licenses or Apple acceptance.
- Public privacy, terms, contact, and help pages exist.
- No general user-report or user-block flow was located in direct messaging. A complete cross-surface reporting/blocking audit and implementation remains required for user-generated content under Apple's guideline 1.2.
- Privacy policy contains an under-13 exclusion while Terms require adult account creation; the owner must provide an accurate App Store age rating and privacy declarations. No legal copy was silently changed.

## Consumption-first payment preparation
The owner selected consumption-first native iPhone launch. A shared Capacitor runtime policy now suppresses pricing, digital membership/boost checkout, credit-pack purchases, tip checkout, trial upsells, and billing-portal links in native iOS. Direct digital checkout callbacks also reject before creating payment sessions. Billing and credit history remain readable; existing subscription checks and live/music permissions remain authoritative. Browser and installed PWA payments, Android behavior, physical merchandise, and existing billing agreements are unchanged.

This is client presentation policy, not a security boundary or completed App Store certification. It does not alter server authorization or cancel existing subscriptions. Review booking and generic-cart product classification and any new purchase surfaces before native submission. Native OAuth and hosted-origin Capacitor runtime detection still need physical-device verification. US external-link rules and other permitted programs mean the earlier universal prohibition was too broad; do not infer storefront authorization from geolocation, locale, or user-agent.

Verified for this step: 22 purchase-policy, sign-in continuation and trial tests passed. A temporary signed-in member saw unchanged paid-plan and credit-pack controls in the web browser. In an explicitly simulated native-iOS runtime, paid-plan checkout was replaced by an account notice, Continue to music opened Home, and credit balance/history remained readable with purchase packs absent. The checked screens fit 320/390px widths with no runtime errors. No payment was created; this is not physical iPhone or App Store verification.

## Native handoff — not compiled or submitted
This repository remains a TanStack web app with an existing Capacitor configuration. The development environment cannot compile, sign, or upload an iOS app. The HTTPS configuration change is not proof of native OAuth, background audio, camera, microphone, or purchase functionality.

On the owner's Mac, prepare the iOS project using the installed Capacitor version and a verified web shell, not the TanStack server bundle. Configure the owner's final bundle identifier and signing team. Review the installed Capacitor documentation before selecting remote-origin OAuth/native auth-session handling; do not authorize arbitrary origins or add broad insecure transport exceptions.

Required native permission declarations include:
- `NSCameraUsageDescription`: Tunevio uses your camera when you choose to broadcast live video or join a freestyle video battle.
- `NSMicrophoneUsageDescription`: Tunevio uses your microphone when you choose to speak on stage, broadcast, or join a freestyle battle.
- `UIBackgroundModes` with `audio` only if background playback is implemented and tested. A declaration alone cannot make browser audio continue when locked.

Test on physical iPhones: Apple and Google sign-in/cancellation, email confirmation, two-artist live cameras/mics, denied permissions, reconnects, background/locked audio, payment strategy, and eventual confirmed account deletion. Check privacy manifests and required-reason APIs for every native plugin. Supply licensed screenshots, support URL, accurate privacy labels, review notes and an authorized review account through App Store Connect.

## Sources
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/
- https://developer.apple.com/design/resources/