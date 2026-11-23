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

## Account deletion — implemented and tested
Settings → Security now provides deliberate DELETE confirmation, cancellation, error/retry states and a persistent signed-out success screen. Only the bearer-verified caller can be deleted; the request cannot select another account. Personal rows are removed transactionally, uploaded files are removed through the storage API, and Auth is deleted last. Apple-linked accounts receive the managed Disconnect Apple link after successful deletion.

Financial references to removed accounts/content are retained as UUIDs. Ended stream join keys remain with anonymized presentation so existing earnings queries still work. Earnings finalization resolves the owner's existing rate before the profile is removed. Private receipts archive financial rows and enforce seven calendar years from completed deletion; financial delete guards prevent premature erasure and preserve pending/unpaid earnings afterward. Disposal after expiry requires financial review, not an automatic unqualified purge. Active Stripe subscriptions are canceled before cleanup; billing failures stop deletion.

On November 23, 2026, two disposable real Cloud accounts were deleted through the Settings UI. Verified login/profile removal, actual uploaded-photo removal, rejection of the deleted session, preserved failed sandbox payment ($12.34), retained canceled sandbox subscription, pending zero-value test royalty and host earnings, and exact November 23, 2033 retention deadlines. A deliberate attempt to erase the sandbox payment was refused by the financial-retention guard. No actual purchase/payout was created and no existing member was deleted. Confirmation/cancel/success/return-to-Home worked at 320/390px and the page was inspected at 1280px without runtime errors or horizontal overflow.

Still unverified: canceling an actual Stripe test subscription, actual Apple authorization revocation and its in-app native auth-session return, and physical iPhone deletion. These require an authorized billed test account, Apple sign-in and a native shell/device; do not represent the web check as completed App Store certification.

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