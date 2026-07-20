import { sanitizeObjectDeep, sanitizeString } from './xss-sanitize.util';

describe('xss sanitize', () => {
  it('strips script tags and javascript URIs', () => {
    expect(
      sanitizeString('<script>alert(1)</script>Hello javascript:alert(2)'),
    ).toBe('Hello alert(2)');
  });

  it('preserves legitimate angle brackets in text', () => {
    expect(sanitizeString('qty < 10 and rate > 5')).toBe('qty < 10 and rate > 5');
  });

  it('sanitizes nested objects', () => {
    const cleaned = sanitizeObjectDeep({
      notes: '<iframe src="x"></iframe>ok',
      nested: { html: '<svg onload=alert(1)>' },
    });
    expect(cleaned.notes).toBe('ok');
    expect(cleaned.nested.html).not.toContain('svg');
    expect(cleaned.nested.html).not.toContain('onload');
  });
});
