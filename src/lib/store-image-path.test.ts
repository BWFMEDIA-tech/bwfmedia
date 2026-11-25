import { describe, expect, it } from 'vitest';
import { isOwnedStoreImage, PRIVATE_STORE_IMAGE_TTL } from './store-image-path';
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
describe('store image authorization paths', () => {
  it('accepts canonical owner images', () => { expect(isOwnedStoreImage(`${a}/pages/cover.webp`,a)).toBe(true); });
  it('rejects another artist image', () => { expect(isOwnedStoreImage(`${b}/private.webp`,a)).toBe(false); });
  it.each(['../private.jpg','./private.jpg','%2e%2e/private.jpg','image.jpg?token=x','/image.jpg','image\\file.jpg'])('rejects ambiguous object path %s', tail => {
    expect(isOwnedStoreImage(`${a}/${tail}`,a)).toBe(false);
  });
  it('keeps private links limited to five minutes', () => { expect(PRIVATE_STORE_IMAGE_TTL).toBe(300); });
});