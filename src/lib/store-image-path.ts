/** Only canonical object paths in the product/page owner's folder may be published or signed. */
export function isOwnedStoreImage(path: unknown, ownerId: string): path is string {
  if (typeof path !== 'string' || !path.startsWith(`${ownerId}/`) || path.length > 300) return false;
  const parts = path.split('/');
  return parts.length >= 2 && parts.every(part => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..');
}

export const PRIVATE_STORE_IMAGE_TTL = 300;
export const PUBLIC_STORE_IMAGE_TTL = 3600;