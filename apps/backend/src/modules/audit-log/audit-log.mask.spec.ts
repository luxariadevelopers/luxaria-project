import { maskSensitiveData } from './audit-log.mask';

describe('maskSensitiveData', () => {
  it('masks passwords, tokens, and bank account fields', () => {
    const masked = maskSensitiveData({
      email: 'a@luxaria.test',
      password: 'SuperSecret1!',
      refreshToken: 'jwt.token.value',
      bankDetails: {
        bankName: 'HDFC',
        accountNumber: '123456789012',
        accountNumberEncrypted: 'enc:abc',
        accountNumberLast4: '9012',
        ifsc: 'HDFC0001234',
      },
      nested: [{ accessToken: 'abc', note: 'ok' }],
    });

    expect(masked.email).toBe('a@luxaria.test');
    expect(masked.password).toBe('********et1!');
    expect(masked.refreshToken).toBe('********alue');
    expect(masked.bankDetails.bankName).toBe('HDFC');
    expect(masked.bankDetails.accountNumber).toBe('********9012');
    expect(masked.bankDetails.accountNumberEncrypted).toBe('********:abc');
    expect(masked.bankDetails.accountNumberLast4).toBe('9012');
    expect(masked.bankDetails.ifsc).toBe('HDFC0001234');
    expect(masked.nested[0].accessToken).toBe('********');
    expect(masked.nested[0].note).toBe('ok');
  });
});
