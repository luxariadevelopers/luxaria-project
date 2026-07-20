import { afterEach, describe, expect, it, vi } from 'vitest';
import { openPdfUrl, popupBlockedMessage, printPdfUrl } from './openPdfUrl';

describe('openPdfUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok when window.open succeeds', () => {
    const fake = { focus: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fake);

    const result = openPdfUrl('https://example.test/doc.pdf');
    expect(result).toEqual({ ok: true, window: fake });
    expect(window.open).toHaveBeenCalledWith(
      'https://example.test/doc.pdf',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('detects popup-blocked when window.open returns null', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    const result = openPdfUrl('https://example.test/doc.pdf');
    expect(result).toEqual({ ok: false, reason: 'popup_blocked' });
    expect(popupBlockedMessage()).toMatch(/Pop-up blocked/i);
  });

  it('printPdfUrl also reports popup-blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(printPdfUrl('https://example.test/doc.pdf')).toEqual({
      ok: false,
      reason: 'popup_blocked',
    });
  });
});
