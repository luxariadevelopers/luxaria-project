import {
  attachmentMetaSchema,
  attachmentSizeSchema,
  bankAccountNumberSchema,
  documentMimeTypeSchema,
  emailSchema,
  gstinRequiredSchema,
  ifscRequiredSchema,
  isoDateOnlySchema,
  isoDateStringSchema,
  mobileRequiredSchema,
  moneyEquals,
  moneyNonNegativeSchema,
  panRequiredSchema,
  panSchema,
  percentageSchema,
  quantitySchema,
  roundMoney,
  roundQty,
  sha256ChecksumSchema,
} from './index';

describe('shared validation schemas', () => {
  describe('money', () => {
    it('accepts non-negative amounts and rounds to 2 dp', () => {
      expect(moneyNonNegativeSchema.parse(10.5)).toBe(10.5);
      expect(roundMoney(10.005)).toBe(10.01);
      expect(moneyEquals(1.001, 1.002)).toBe(true);
      expect(moneyNonNegativeSchema.safeParse(-1).success).toBe(false);
    });

    it('validates percentage 0–100', () => {
      expect(percentageSchema.parse(0)).toBe(0);
      expect(percentageSchema.parse(100)).toBe(100);
      expect(percentageSchema.safeParse(100.1).success).toBe(false);
    });
  });

  describe('quantity', () => {
    it('accepts ≥ 0 and rounds to 6 dp', () => {
      expect(quantitySchema.parse(0)).toBe(0);
      expect(quantitySchema.parse(12.5)).toBe(12.5);
      expect(roundQty(1.123456789)).toBe(1.123457);
      expect(quantitySchema.safeParse(-0.1).success).toBe(false);
    });
  });

  describe('dates', () => {
    it('accepts YYYY-MM-DD and parseable ISO strings', () => {
      expect(isoDateOnlySchema.parse('2026-07-20')).toBe('2026-07-20');
      expect(isoDateOnlySchema.safeParse('20-07-2026').success).toBe(false);
      expect(isoDateStringSchema.parse('2026-07-20T10:00:00.000Z')).toBe(
        '2026-07-20T10:00:00.000Z',
      );
      expect(isoDateStringSchema.safeParse('not-a-date').success).toBe(false);
    });
  });

  describe('identity', () => {
    it('validates PAN / GSTIN like backend company.validation', () => {
      expect(panRequiredSchema.parse('ABCDE1234F')).toBe('ABCDE1234F');
      expect(panSchema.parse(' abcde1234f ')).toBe('ABCDE1234F');
      expect(panSchema.parse('')).toBeNull();
      expect(panRequiredSchema.safeParse('BAD').success).toBe(false);

      expect(gstinRequiredSchema.parse('33ABCDE1234F1Z5')).toBe(
        '33ABCDE1234F1Z5',
      );
      expect(gstinRequiredSchema.safeParse('BAD').success).toBe(false);
    });
  });

  describe('contact', () => {
    it('validates email and Indian mobile', () => {
      expect(emailSchema.parse(' Engineer@Luxaria.DEV ')).toBe(
        'engineer@luxaria.dev',
      );
      expect(emailSchema.parse('')).toBeNull();
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);

      expect(mobileRequiredSchema.parse('9876543210')).toBe('9876543210');
      expect(mobileRequiredSchema.safeParse('12345').success).toBe(false);
      expect(mobileRequiredSchema.safeParse('5876543210').success).toBe(false);
    });
  });

  describe('banking', () => {
    it('validates IFSC and account numbers', () => {
      expect(ifscRequiredSchema.parse('hdfc0001234')).toBe('HDFC0001234');
      expect(ifscRequiredSchema.safeParse('BADIFSC').success).toBe(false);

      expect(bankAccountNumberSchema.parse('123456789012')).toBe('123456789012');
      expect(bankAccountNumberSchema.parse('1234 5678 9012')).toBe(
        '123456789012',
      );
      expect(bankAccountNumberSchema.safeParse('123').success).toBe(false);
    });
  });

  describe('attachments', () => {
    it('enforces MIME allowlist, size bounds and checksum', () => {
      expect(documentMimeTypeSchema.parse('application/pdf')).toBe(
        'application/pdf',
      );
      expect(documentMimeTypeSchema.safeParse('image/svg+xml').success).toBe(
        false,
      );

      expect(attachmentSizeSchema.parse(1)).toBe(1);
      expect(attachmentSizeSchema.safeParse(0).success).toBe(false);
      expect(
        attachmentSizeSchema.safeParse(100 * 1024 * 1024 + 1).success,
      ).toBe(false);

      const checksum = 'a'.repeat(64);
      expect(sha256ChecksumSchema.parse(checksum)).toBe(checksum);
      expect(sha256ChecksumSchema.safeParse('abc').success).toBe(false);

      expect(
        attachmentMetaSchema.parse({
          originalFileName: 'bill.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          documentType: 'invoice',
          checksum,
        }).documentType,
      ).toBe('invoice');
    });
  });
});
