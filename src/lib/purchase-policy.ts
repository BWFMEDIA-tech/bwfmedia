import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export function allowsDigitalPurchases(native: boolean, platform: string): boolean {
  return !(native && platform === 'ios');
}

/** Native app policy, not an authorization or subscription entitlement check. */
export function canStartDigitalPurchase(): boolean {
  return allowsDigitalPurchases(Capacitor.isNativePlatform(), Capacitor.getPlatform());
}

export function assertDigitalPurchaseAllowed(): void {
  if (!canStartDigitalPurchase()) {
    throw new Error('Digital purchases are not available in this iPhone app.');
  }
}

/** Keep checkout unmounted until the actual runtime is known after hydration. */
export function useDigitalPurchasesAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => { setAvailable(canStartDigitalPurchase()); }, []);
  return available;
}