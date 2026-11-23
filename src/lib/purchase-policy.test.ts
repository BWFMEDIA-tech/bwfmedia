import { describe, expect, it, vi } from 'vitest';
import { allowsDigitalPurchases, assertDigitalPurchaseAllowed } from './purchase-policy';
import { Capacitor } from '@capacitor/core';

describe('consumption-first iPhone launch', () => {
  it('does not allow digital purchases in native iOS', () => {
    expect(allowsDigitalPurchases(true, 'ios')).toBe(false);
  });
  it('preserves web payments including iPhone browsers and installed PWAs', () => {
    expect(allowsDigitalPurchases(false, 'ios')).toBe(true);
    expect(allowsDigitalPurchases(false, 'web')).toBe(true);
  });
  it('does not change Android billing', () => {
    expect(allowsDigitalPurchases(true, 'android')).toBe(true);
  });
  it('stops native iOS checkout callbacks before payment creation', () => {
    const native = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const platform = vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    try { expect(() => assertDigitalPurchaseAllowed()).toThrow(); }
    finally { native.mockRestore(); platform.mockRestore(); }
  });
});