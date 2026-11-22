# Prepare Tunevio for App Store submission

## Goal
Prepare the existing Tunevio app for an iPhone release without rebuilding it or changing working web payments, profiles, music, battles, or live broadcasting. This preparation does not guarantee Apple approval or submit an app.

## Confirmed gaps
- Settings → Security currently has no account-deletion action.
- The member sign-in page offers Google but not Apple.
- The mobile app configuration points at the editor preview and permits insecure connections.
- No native iOS project is present in the checkout.

## Implementation
1. **Account deletion:** Add an easy-to-find action in Security with explicit confirmation and recent identity verification. Inspect actual database relationships and storage before deleting anything; delete only the authenticated caller's account and associated removable data. Explain any legally retained transaction records and billing handling. Add managed Apple authorization disconnection after deletion. Never test deletion on an existing customer's account.
2. **Apple sign-in:** Enable Apple and add equally prominent, correctly styled sign-in/signup buttons using the existing account flow. Preserve existing profile data, email confirmation, Google sign-in, role checks, and safe redirects. Do not automatically merge unrelated accounts based only on matching email.
3. **iPhone packaging:** Replace the preview-only configuration with a production-safe setup after checking hosted-app and OAuth behavior. Keep TanStack Start; do not assume its server build can be bundled as a static mobile app. Prepare camera/microphone permission descriptions, background-audio requirements, and native handoff instructions. Xcode compilation, signing, and upload require the owner's Mac and Apple Developer account.
4. **Review safeguards:** Check existing user reporting, blocking, moderation, support/privacy links, music-rights handling, and privacy disclosures. Fix confirmed gaps only; do not invent licenses or claim that live user content is already review-compliant.
5. **Verification:** Run focused account authorization/deletion tests with disposable accounts; verify signed-in settings and sign-in screens at phone and desktop sizes. List physical-device checks separately: Apple login, camera/microphone battles, background audio, permission denial, and native checkout.

## Payment decision — required before changing iPhone purchases
Choose either:
- **Consumption-first release:** Keep existing web Stripe payments unchanged; make the iPhone app usable with existing entitlements and omit digital purchasing where Apple requires in-app purchase. Physical merchandise remains on Stripe. Audit all upgrade, boost, gift, tip, and purchase-link entry points rather than hiding only one pricing button.
- **Native purchasing release:** Add Apple in-app purchases for approved digital products with server-verified purchases, restoration, and synchronized entitlements. Keep web Stripe agreements unchanged. Product setup and native testing require App Store Connect access.

No digital purchase behavior will change until this choice is confirmed. Apple's rules vary by storefront and permitted programs; the earlier blanket claim that all external digital payment links are prohibited was too broad. Do not use device location or browser language as proof of App Store storefront.

## Database and security
Reuse the existing account/profile model and authorization middleware. Inspect foreign keys, active streams, recurring subscriptions, payouts, and financial record retention before deletion. Keep privileged deletion server-only, fail closed on authorization errors, and preserve financial audit integrity. Any required migration must include narrow permissions and regression tests.

## Owner handoff
The owner supplies an Apple Developer membership, App Store Connect access, a Mac/Xcode signing environment, accurate privacy/business declarations, and authorized review credentials. A signed native build, TestFlight checks, screenshots, age rating, and Apple review remain required after the web changes.

## References
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)