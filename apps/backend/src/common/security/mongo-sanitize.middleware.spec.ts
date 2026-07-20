import { sanitizeValue } from './mongo-sanitize.middleware';

describe('mongo sanitize', () => {
  it('strips Mongo operator and prototype pollution keys', () => {
    const input = {
      email: 'a@b.com',
      $gt: '',
      nested: { role: 'user', $ne: null, __proto__: { admin: true } },
      list: [{ $where: '1==1' }, { ok: true }],
    };

    const cleaned = sanitizeValue(input);

    expect(cleaned).toEqual({
      email: 'a@b.com',
      nested: { role: 'user' },
      list: [{}, { ok: true }],
    });
    expect(Object.prototype.hasOwnProperty.call(cleaned, '$gt')).toBe(false);
  });
});
