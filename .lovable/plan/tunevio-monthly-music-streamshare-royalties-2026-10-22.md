# Tunevio monthly music streamshare royalties

## Verified starting point
- Existing revenue ledger, monthly pools, artist royalty ledger, rights records, fraud flags, statements and Stripe Connect payout requests can be reused.
- The deployed split function currently uses **70% artist / 20% platform / 10% incentives**, not 60/40. Existing pool revenue also includes tips and boosts. Neither matches the requested music-only model.
- The revenue ledger currently contains one tip entry; one approved artist royalty record exists. Preserve both unchanged.
- Statements currently include artist-entered reports; those must remain separate from authoritative Tunevio-generated settlement statements.
- A payout processor runs every ten minutes. Its balance reservation, claiming, settlement and recovery paths need safeguards before this model can pay anyone.

## Calculation rules
1. Apply the new model prospectively to explicitly reviewed music revenue. Do not reclassify old receipts or recalculate existing approved, linked or paid royalties.
2. Determine eligible net music revenue from settled receipts after attributable refunds/chargebacks, actual payment fees, taxes and applicable music licensing obligations. Exclude merchandise, direct tips, non-music bookings and other unapproved revenue. Unknown fees, licensing obligations or revenue allocation remain on hold—not assumed to be zero.
3. Allocate **60%** of that eligible net amount to artists and the remaining **40%** to Tunevio; remove any incentive allocation for this music calculation only. Merchandise remains 100% artist net profit.
4. Count qualified streams equally, rather than using subscription or engagement multipliers. Require measured listening of at least 30 seconds, trusted progress validation, deduplication, cleared fraud review, eligible published music and reviewed rights/dispute status. Unvalidated historic starts never become payable streams.
5. Calculate each eligible artist’s monthly fraction as their qualified streams divided by all qualified streams among eligible artists. No guaranteed per-stream rate.
6. Use integer-cent allocation with deterministic largest-remainder rounding. If no eligible streams exist, hold the artist allocation undistributed with an explicit reason. Negative adjustments carry forward instead of creating negative payouts.

## Minimal implementation
### Existing records and payment events
- Add forward-only migrations extending existing ledger, pool, royalty, statement and payout records with model version, currency/environment, review state, deductions and immutable calculation references; do not create a parallel accounting system.
- Record settled music-related Stripe receipts and actual fees through the existing verified webhook and gateway utility. Keep receipt/reversal ingestion idempotent. Missing settlement details remain pending reconciliation.
- Append refund/chargeback adjustments linked to original receipts, including partial refunds and late adjustments after a month is locked. Do not overwrite historical payments or silently deduct the same costs twice.
- Provide reviewed allocation for mixed-purpose subscription/ad revenue; no automatic assumption that every subscription dollar is eligible music revenue.

### Monthly calculation and review
- Replace the music royalty calculation with a transactional, closed-month calculation using reviewed ledger inputs and qualified stream counts.
- Snapshot inputs, deductions, eligibility exclusions, artist totals, rounding and carry-forwards. Pending recalculations are idempotent; approved/settled snapshots are immutable.
- Add music royalty review to the existing admin Payouts page: month selection, reconciliation totals, held items, calculation preview and audited month approval. Approval cannot itself enable real transfers.
- Reuse Artist Dashboard earnings/history and existing statements for authoritative Tunevio statements; identify generated statements separately and prevent artist edits/deletion of those generated records. Preserve existing artist-entered statements and tip credits.

### Payout safeguards
- Reserve approved royalty balances and link the exact royalty records to existing payout requests atomically, scoped to source, environment and currency. Failed requests release reservations safely; no cross-source double spending.
- Claim queued requests atomically, retain Stripe idempotency keys, reconcile transfers after interrupted processing and mark linked royalties settled transactionally. A transfer to Connect is not reported as a confirmed bank deposit.
- Enforce the model’s live-payout hold in both database reservation/transition rules and the processor, including mixed legacy-tip/music balances. Preserve unrelated legacy payouts.
- Keep **real music royalty payouts disabled** until calculation tests, sandbox payout/retry/reversal checks and explicit founder approval are recorded. Existing auto-payout preferences cannot bypass this hold. Plan approval is not payout approval.

## Tests and acceptance
- Test exact 60/40 allocation, proportional stream shares, equal stream weighting, deterministic cent rounding and no fixed per-stream rate.
- Test ineligible revenue, unknown licensing/fees, refunded/partially refunded receipts, duplicate events, late adjustments and zero-stream months.
- Test fraud flags, invalid duration/session evidence, rights disputes and artist eligibility exclusions.
- Test immutable approved history, repeat calculation, protected generated statements, authorization and own-account financial visibility.
- Test concurrent payout reservation/claim, environment/currency isolation, failure recovery, idempotent settlement and live-payout rejection while held.
- Exercise the admin calculation → artist statement → sandbox Connect reservation/transfer/reconciliation flow using isolated test records. If sandbox Connect is unavailable, leave that check explicitly blocked and real payouts disabled.
- Verify the existing admin and artist pages on desktop and phones, check current build/runtime signals and report actual results. No publishing or real transfers.

## Technical approach
- Use existing PostgreSQL functions/transactions for financial arithmetic, locks, immutable snapshots and authorization. Apply all schema changes through migrations with explicit grants, RLS and restricted function execution.
- Use existing authenticated server functions for admin review and artist reads; gateway-backed Stripe access remains server-only.
- Add indexes only for the qualified monthly reads and reconciliation keys; no new permanent polling loops. Reuse the existing processor and webhook reconciliation.
- Record structural decisions in AGENTS.md and retain small rule-specific tests alongside the existing tests.

## Operational requirements before money is released
Real revenue allocation, licensing agreements/costs and sandbox Connect readiness must be verified rather than invented. Any unresolved requirement stays visibly held; no new subscriptions, fixed earning promises or unrelated monetization features are introduced.