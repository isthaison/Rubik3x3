/**
 * Utility for triggering haptic feedback via the Web Vibration API.
 * Safely guards against platforms that do not support it.
 */
export function triggerHaptic(duration: number | number[] = 15) {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignore security or frame errors gracefully
      console.warn('Haptic feedback is not allowed in this environment:', e);
    }
  }
}
