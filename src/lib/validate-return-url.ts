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
  'tunevio.lovable.app',
  'id-preview--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app',
  '27e4a45a-5178-4d5c-983d-86a01b3c0985.lovableproject.com',
];

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
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
    throw new Error('returnUrl must be https');
  }
  if (parsed.username || parsed.password) throw new Error('Invalid returnUrl');
  const ok = ALLOWED_HOSTS.includes(host) || isLocal;
  if (!ok) {
    throw new Error('returnUrl must be on the application domain');
  }
  return parsed.toString();
}