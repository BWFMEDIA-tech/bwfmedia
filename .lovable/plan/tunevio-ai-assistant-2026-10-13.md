# Tunevio AI Assistant

One ongoing conversation per signed-in account, saved to their account (limited and clearable). The assistant can only read and explain. It never changes roles, money, content or purchases.

## What people will see
- A floating robot button on public and member pages. It is hidden on admin, Stream Studio, live stage and checkout pages so it never covers live controls.
- A dedicated `/help` page with the full chat, suggested questions for each role, a Clear chat button, loading and error states, and helpful / not helpful buttons.
- Answers with numbered steps, plus "Show me where" buttons that open only pages that really exist on Tunevio.
- Signed-out visitors can ask general questions and get a link to the signup page. Their chat is not saved.
- A new robot avatar in cyan, electric blue, silver and black, with no pink or purple, following the project memory.

## Knowledge base
- Help articles are stored in the database and grouped by audience: everyone, fan, artist, host, moderator or admin.
- The first articles are written only from features that exist today: signup and login, password reset, profile settings, artist dashboard, upload, Go Live, Stream Studio, battles and voting, following, messages, store, NFC pages, music rights, analytics and earnings screens.
- Anything that can't be confirmed in the app, such as host percentages, payout amounts or referral rules, is marked "not confirmed". The assistant then says it can't verify the answer and points people to support.
- The assistant answers only from the published articles and the list of allowed pages. If it can't answer reliably, it offers a support contact.

## Admin tools at `/admin/assistant`
- Create, edit, publish and unpublish help articles.
- See questions the assistant couldn't answer and questions marked not helpful.
- See basic usage totals.
- Access is limited to admins through the existing role check, and changes are recorded in the existing admin audit log.

## Technical details
- Tables:
  - `assistant_articles`: everyone can read published rows; only admins can write.
  - `assistant_messages`: each user can read and delete only their own messages; the last 50 are kept.
  - `assistant_feedback`: users can insert feedback; admins can read it.
  - `assistant_unanswered`: admins can read it; the server writes to it.
- Every table gets RLS and the required access grants.
- A server route at `/api/assistant/chat` handles the chat through the Lovable AI Gateway using the default model, with streaming. Requests are validated and rate-limited with the existing `check_rate_limit` function. The user's role comes from `user_roles` on the server.
- Role guidance is sent as context only. The assistant has no tools that can change anything.
- Navigation buttons are checked against a fixed list of allowed pages, and any other link is removed.
- The chat is built from AI Elements components and renders Markdown.
- No new secrets are needed because the AI key is already provisioned.

## Testing
- Signed out, fan, artist and admin experiences.
- Mobile and desktop layouts.
- Permission checks for another user's chat and admin pages.
- AI errors, including out of credits and rate limits.
- Clear chat and saved history after reload.
