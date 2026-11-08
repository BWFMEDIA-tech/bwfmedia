/** Browser-safe helpers for the Tunevio AI Assistant. */

/** Only these pages may appear as "Show me where" buttons. */
export const ASSISTANT_ROUTES: Record<string, string> = {
  "/": "Home (landing page)",
  "/home": "Home",
  "/signup": "Sign up",
  "/login": "Sign in",
  "/forgot-password": "Forgot password",
  "/settings": "Settings",
  "/settings/profile": "Profile settings",
  "/settings/payouts": "Payouts and bank connection",
  "/settings/membership": "Membership",
  "/artist-dashboard": "Artist dashboard",
  "/upload": "Upload",
  "/videos": "Music videos",
  "/go-live": "Go Live",
  "/broadcast": "Broadcast",
  "/stream-studio": "Stream Studio",
  "/live": "Live now",
  "/play": "Play Arena",
  "/play/challenges": "Battle challenges",
  "/mic-drop": "Mic Drop Arena",
  "/store": "Store",
  "/artist-store": "Artist Store",
  "/artist-store/pages": "NFC pages",
  "/artist-store/tags": "NFC tags",
  "/messages": "Messages",
  "/notifications": "Notifications",
  "/rights": "Music rights",
  "/artists": "Artists",
  "/discover": "Discover",
  "/search": "Search",
  "/library": "Your library",
  "/charts": "Charts",
  "/leaderboard": "Leaderboard",
  "/events": "Events",
  "/blog": "Blog",
  "/distribution": "Distribution",
  "/artist-analytics": "Analytics",
  "/earnings": "Earnings",
  "/host-earnings": "Host earnings",
  "/payouts": "Payouts",
  "/pricing": "Pricing",
  "/contact": "Contact support",
  "/help": "Help",
  "/admin": "Admin dashboard",
  "/admin/announcements": "Announcements (admin)",
  "/admin/users": "Manage accounts (admin)",
  "/admin/assistant": "Assistant articles (admin)",
};

export const UNANSWERED_MARKER = "[[unanswered]]";

export type AssistantAudience = "guest" | "fan" | "artist" | "host" | "moderator" | "admin";

/** Picks the most specific audience from server-verified roles. */
export function audienceFromRoles(roles: readonly string[] | null): AssistantAudience {
  if (!roles) return "guest";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("artist")) return "artist";
  if (roles.includes("host") || roles.includes("manager")) return "host";
  if (roles.includes("moderator")) return "moderator";
  return "fan";
}

/** Returns the internal path when a link target is an allowed page, otherwise null. */
export function allowedAssistantPath(href: string | undefined | null): string | null {
  if (!href) return null;
  const path = href.trim().split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(ASSISTANT_ROUTES, path) ? path : null;
}

export const SUGGESTED_QUESTIONS: Record<AssistantAudience, string[]> = {
  guest: ["How do I create an account?", "What can I do on Tunevio?", "How do battles and voting work?"],
  fan: ["How do I follow an artist?", "How do I join a live?", "Why can't I vote in a battle?"],
  artist: ["How do I upload a song or music video?", "How do I challenge an artist to a freestyle battle?", "How do I connect my payout?"],
  host: ["How do I go live?", "My microphone isn't working on stage", "Where are my host earnings?"],
  moderator: ["How do I moderate a live room?", "How do raised hands work?", "How do I contact support?"],
  admin: ["How do I make an announcement?", "How do I delete an account?", "How do I edit help articles?"],
};
