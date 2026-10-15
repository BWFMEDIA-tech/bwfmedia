// Emails an announcement to members through Resend (gateway-backed connector).
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
// Must be an address on a domain verified in the Resend account.
export const ANNOUNCEMENT_FROM = "TUNEVIO <announcements@tunevio.com>";
const SITE = "https://tunevio.com";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function announcementHtml(a: { kind: "update" | "event"; title: string; body?: string; link?: string; mediaUrl?: string; mediaType?: "image" | "video" }) {
  const href = a.link ? SITE + a.link : SITE;
  return `<div style="background:#ffffff;font-family:Arial,sans-serif;padding:24px">
  <div style="max-width:560px;margin:0 auto">
    <p style="color:#0057FF;font-weight:bold;letter-spacing:2px;font-size:12px">TUNEVIO ${a.kind === "event" ? "EVENT" : "UPDATE"}</p>
    <h1 style="color:#0a0a0a;font-size:22px">${esc(a.title)}</h1>
    ${a.body ? `<p style="color:#333;font-size:15px;line-height:1.5">${esc(a.body).replace(/\n/g, "<br>")}</p>` : ""}
    ${a.mediaUrl && a.mediaType === "image" ? `<img src="${esc(a.mediaUrl)}" alt="" style="width:100%;border-radius:8px;margin:8px 0 16px">` : ""}
    ${a.mediaUrl && a.mediaType === "video" ? `<p><a href="${esc(a.mediaUrl)}" style="color:#0057FF;font-weight:bold">&#9654; Watch the video</a></p>` : ""}
    <a href="${esc(href)}" style="display:inline-block;background:#00B8E6;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open Tunevio</a>
    <p style="color:#888;font-size:12px;margin-top:32px">You're receiving this because you have a Tunevio account. Turn off email alerts any time in <a href="${SITE}/settings/notifications" style="color:#0057FF">notification settings</a>.</p>
  </div></div>`;
}

/** Sends one email per recipient (no shared To lines), 100 per batch call. */
export async function emailAnnouncement(
  emails: string[],
  a: { kind: "update" | "event"; title: string; body?: string; link?: string; mediaUrl?: string; mediaType?: "image" | "video" },
) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Email service is not connected");
  const html = announcementHtml(a);
  const subject = a.kind === "event" ? `Event: ${a.title}` : a.title;
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((to) => ({ from: ANNOUNCEMENT_FROM, to: [to], subject, html }));
    const res = await fetch(`${GATEWAY_URL}/emails/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`[announcement-email] ${res.status}: ${t}`);
      errors.push(`${res.status}: ${t.slice(0, 200)}`);
      continue;
    }
    sent += batch.length;
  }
  return { sent, error: errors[0] ?? null };
}
