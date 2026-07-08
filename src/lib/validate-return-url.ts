const ALLOWED_HOSTS = [
  // Current production domain (Stripe return URLs are built from
  // window.location.origin, which is https://tunevio.com in production).
  'tunevio.com',
  'www.tunevio.com',
  // Legacy / alternate branding domains still pointed at this app.
  'bwfmedia.company',
  'www.bwfmedia.company',
  'bwfmedia.lovable.app',
  'bwfnetwork.com',
  'www.bwfnetwork.com',
  'bwfnetwork.lovable.app',
];

const ALLOWED_HOST_SUFFIXES = ['.lovable.app'];

/**
 * Validates that a client-supplied URL points to a trusted application
 * origin. Throws if the URL is malformed or points off-domain. Prevents
 * open-redirect and phishing-via-our-domain attacks.
 */
export function validateReturnUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid returnUrl');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('returnUrl must be http(s)');
  }
  const host = parsed.hostname.toLowerCase();
  const ok =
    ALLOWED_HOSTS.includes(host) ||
    ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s)) ||
    host === 'localhost';
  if (!ok) {
    throw new Error('returnUrl must be on the application domain');
  }
  return parsed.toString();
}