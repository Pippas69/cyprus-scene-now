/**
 * Haptic feedback utilities for mobile devices
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const triggerHaptic = (style: HapticStyle = 'light') => {
  // Check if the browser supports the Vibration API
  if (!('vibrate' in navigator)) {
    return;
  }

  const patterns: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30]
  };

  navigator.vibrate(patterns[style]);
};

export const hapticFeedback = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error')
};
