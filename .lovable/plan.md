# Music Rights & Royalties dashboard

## What you will get
- New **Music Rights & Royalties** page inside the Artist Dashboard menu (under My Music), styled to match the reference: black glass cards, cyan/electric-blue glow, silver text, a cyan music-shield graphic, no purple or pink.
- Top row of five stat cards: Registrations, Verified, In Progress, Issues, Potential Earnings. All counts come from the artist's own saved records. Earnings show "No earnings reported yet" until the artist enters real statements. Nothing is made up.
- **Rights Organizations** row: U.S. Copyright Office, ASCAP, BMI, Songtrust, SoundExchange, The MLC. Each card shows its real status (Not started / In progress / Submitted / Verified / Issue), the date or member/account ID the artist enters, and a Continue / View Details button.
- Each organization opens a **step-by-step checklist** (for example: create account, add writer info, register works, record member ID). Progress is saved, with links to the official sites.
- Notice banner: "Tunevio does not register your work or collect royalties on your behalf."
- **My Song Catalog** table, linked to the artist's existing Tunevio songs: writers, ISWC, ISRC (reusing the codes from Distribution), ownership split, and rights status. An editor covers songwriter credits, publishers, split percentages (must add up to 100%), and registration reference numbers.
- **Rights disputes**: the artist can raise one on a song, and it shows as an Issue.
- **Recent Activity** feed built from the artist's real actions, plus a **Helpful Resources** panel (Music Rights 101, Understanding Royalties, Which organizations do what).
- **Admin view** at Admin > Music Rights: admins see all registrations and disputes, can mark items Verified or Issue, and every change is logged in the audit trail.
- Phone layout: cards stack, the organization row scrolls sideways, and the catalog table becomes song cards.

## External integrations (prepared, not connected)
There is no live connection to any organization. Each one gets a placeholder that runs on the server, and keys never reach the browser. After building, I'll list each organization's real API status and what approval is needed. For example, most offer no public API, and The MLC and SoundExchange only give data access to approved partners. I won't invent endpoints.

## Technical details
New tables (all row-level security, owner-only access, plus admin read/update through `has_role`):
- `rights_registrations`: user_id, organization (enum of 6), status, member_id, reference, applied_at, checklist jsonb, notes.
- `song_rights`: track_id (existing play_tracks), user_id, iswc, isrc, publisher, registration_refs jsonb.
- `song_rights_splits`: song_rights_id, name, role (writer/publisher/producer), ipi, share_pct. A trigger checks that the total is 100% or less.
- `rights_disputes`: song_rights_id, user_id, organization, description, status.
- `rights_activity`: user_id, kind, summary, created_at. Filled by triggers on the tables above.
- `royalty_statements`: user_id, organization, period, amount_cents, entered by the artist (reported, not verified).
- Admin changes go to the existing `admin_audit_log`.
- Server functions in `src/lib/rights.functions.ts` use `requireSupabaseAuth`. The admin ones check the admin role first.
- No changes to streaming, live rooms, battles, uploads, subscriptions, revenue, or Distribution tables. ISRC is only read from them.
- Tests: the split total rule and status counting.
