import { describe, expect, it } from 'vitest';
import { APP_STORE_URL, appStoreLink, isAppStoreUrl } from './app-store';

describe('App Store link', () => {
  it('shows no store button until a real listing URL is saved', () => {
    expect(APP_STORE_URL.trim()).toBe('');
    expect(appStoreLink()).toBeNull();
  });

  it('accepts only a live apps.apple.com URL', () => {
    expect(isAppStoreUrl('https://apps.apple.com/us/app/tunevio/id1234567890')).toBe(true);
    expect(isAppStoreUrl('https://apps.apple.com/app/id1234567890')).toBe(true);
    for (const candidate of ['', 'TBD', 'http://apps.apple.com/app/id1', 'https://example.com/apps.apple.com', 'apps.apple.com/app/id1']) {
      expect(isAppStoreUrl(candidate)).toBe(false);
    }
  });
});
