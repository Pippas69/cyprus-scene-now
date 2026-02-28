import { Capacitor } from '@capacitor/core';

/**
 * Returns true when the app is running inside a Capacitor native shell
 * (iOS / Android). Returns false in the browser (dev, PWA, preview).
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Returns 'ios' | 'android' | 'web'
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};
