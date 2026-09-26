let liveRegion: HTMLElement | null = null;

/** Announce a message to screen readers through a polite live region. */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'visually-hidden';
    liveRegion.setAttribute('role', 'status');
    document.body.append(liveRegion);
  }
  liveRegion.setAttribute('aria-live', politeness);
  // Clear first so repeating the same message is announced again
  liveRegion.textContent = '';
  window.setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message;
  }, 30);
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Move focus to an element that isn't normally focusable (e.g. a results heading). */
export function focusElement(element: HTMLElement | null): void {
  if (!element) return;
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: prefersReducedMotion() });
}
