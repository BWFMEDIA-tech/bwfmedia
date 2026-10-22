import { hasArtistTools } from "./artist-navigation";

export type SettingsLink = { to: string; label: string };
export type SettingsGroup = { key: string; label: string; items: SettingsLink[] };

/** General Settings hierarchy. Navigation only — each page keeps its own permission checks. */
export function settingsGroups(roles: readonly string[]): SettingsGroup[] {
  const artist = hasArtistTools(roles);
  const earner = artist || roles.includes("host") || roles.includes("manager");
  const groups: (SettingsGroup | null)[] = [
    { key: "account", label: "Account", items: [
      { to: "/settings/profile", label: "Profile" },
      { to: "/settings/security", label: "Email, Password & Security" },
      { to: "/settings/billing", label: "Plan & Billing" },
      { to: "/settings/membership", label: "Membership" },
    ] },
    { key: "preferences", label: "Preferences", items: [
      { to: "/settings/appearance", label: "Appearance & Playback" },
      { to: "/settings/notifications", label: "Notifications" },
    ] },
    artist ? { key: "artist", label: "Artist Tools", items: [
      { to: "/settings/artist-info", label: "Artist Profile" },
      { to: "/settings/social-links", label: "Social & Platform Links" },
      { to: "/settings/music-media", label: "Music Preferences" },
      { to: "/settings/events", label: "Events & Showcases" },
      { to: "/settings/broadcast-help", label: "Live Settings" },
    ] } : null,
    earner ? { key: "store", label: "Store & Earnings", items: [
      ...(artist ? [
        { to: "/artist-store/manage", label: "Artist Store & Products" },
        { to: "/artist-store/orders", label: "Orders" },
      ] : []),
      { to: "/settings/payouts", label: "Payouts" },
      { to: "/earnings", label: "Earnings" },
      ...(artist ? [{ to: "/rights", label: "Royalties & Rights" }] : []),
    ] } : null,
    { key: "support", label: "Support & Connections", items: [
      { to: "/settings/connected-apps", label: "Connected Apps" },
      { to: "/help", label: "Help & Support" },
      { to: "/contact", label: "Contact" },
    ] },
  ];
  return groups.filter((g): g is SettingsGroup => g !== null);
}
