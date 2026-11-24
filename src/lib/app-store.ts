/**
 * Single source of truth for the Tunevio App Store listing.
 *
 * Fill APP_STORE_URL with the live https://apps.apple.com/... URL as soon as
 * the listing is public. While it is empty the UI keeps using the in-browser
 * install flow instead of showing a link that would not open.
 */
export const APP_STORE_URL = "";

/** True only for a live Apple App Store listing URL. */
export function isAppStoreUrl(url: string): boolean {
  return /^https:\/\/apps\.apple\.com\//i.test(url.trim());
}

/** The live App Store link, or null when the app is not on the store yet. */
export function appStoreLink(): string | null {
  return isAppStoreUrl(APP_STORE_URL) ? APP_STORE_URL.trim() : null;
}
