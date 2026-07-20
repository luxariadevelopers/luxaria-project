import type { OpenUrlResult } from './types';

/**
 * Open a PDF URL in a new tab. Detects popup blockers (`window.open` → null).
 */
export function openPdfUrl(url: string): OpenUrlResult {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    return { ok: false, reason: 'popup_blocked' };
  }
  return { ok: true, window: opened };
}

/**
 * Trigger browser print for a URL (opens a print-focused window).
 * Callers should handle popup-blocked the same as download.
 */
export function printPdfUrl(url: string): OpenUrlResult {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    return { ok: false, reason: 'popup_blocked' };
  }
  // Allow the document to load before invoking print.
  opened.addEventListener('load', () => {
    try {
      opened.focus();
      opened.print();
    } catch {
      // Cross-origin print may throw; user can still print from the tab.
    }
  });
  return { ok: true, window: opened };
}

export function popupBlockedMessage(): string {
  return 'Pop-up blocked. Allow pop-ups for this site, then try again.';
}
