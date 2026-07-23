import {
  EMPTY_DISPLAY,
  formatDate,
  formatDateTime,
  formatFinancialYear,
  formatFinancialYearFromStart,
  formatIndianNumber,
  formatInr,
  formatInrInWords,
  formatPercentage,
  formatQuantity,
  formatTime,
  getFinancialYear,
  toFiniteNumber,
  toIsoDateString,
} from './index';

describe('@luxaria/shared-format', () => {
  describe('toFiniteNumber', () => {
    it('handles nullish and invalid', () => {
      expect(toFiniteNumber(null)).toBeNull();
      expect(toFiniteNumber(undefined)).toBeNull();
      expect(toFiniteNumber('')).toBeNull();
      expect(toFiniteNumber('abc')).toBeNull();
      expect(toFiniteNumber(Number.NaN)).toBeNull();
      expect(toFiniteNumber(Infinity)).toBeNull();
    });

    it('parses numbers and comma strings', () => {
      expect(toFiniteNumber(0)).toBe(0);
      expect(toFiniteNumber(-12.5)).toBe(-12.5);
      expect(toFiniteNumber('1,234.56')).toBe(1234.56);
    });
  });

  describe('formatInr', () => {
    it('formats null, zero, positive and negative', () => {
      expect(formatInr(null)).toBe(EMPTY_DISPLAY);
      expect(formatInr(0)).toBe('₹0.00');
      expect(formatInr(1234567.89)).toBe('₹12,34,567.89');
      expect(formatInr(-1000)).toMatch(/₹-?1,000\.00/);
    });

    it('supports compact and custom empty', () => {
      expect(formatInr(1000, { compact: true })).toBe('1,000.00');
      expect(formatInr(undefined, { empty: '' })).toBe('');
    });

    it('matches INR snapshot', () => {
      expect({
        nullish: formatInr(null),
        zero: formatInr(0),
        lakh: formatInr(100000),
        crore: formatInr(10000000),
        negative: formatInr(-250.5),
      }).toMatchSnapshot();
    });
  });

  describe('formatInrInWords', () => {
    it('handles nullish, zero, and singular units', () => {
      expect(formatInrInWords(null)).toBe(EMPTY_DISPLAY);
      expect(formatInrInWords(0)).toBe('Zero Rupees Only');
      expect(formatInrInWords(1)).toBe('One Rupee Only');
      expect(formatInrInWords(0.01)).toBe('One Paisa Only');
    });

    it('uses Indian crore / lakh grouping', () => {
      expect(formatInrInWords(8)).toBe('Eight Rupees Only');
      expect(formatInrInWords(100000)).toBe('One Lakh Rupees Only');
      expect(formatInrInWords(25_000_000)).toBe(
        'Two Crore Fifty Lakh Rupees Only',
      );
      expect(formatInrInWords(12.5)).toBe(
        'Twelve Rupees and Fifty Paise Only',
      );
    });

    it('supports suffixOnly false and custom empty', () => {
      expect(formatInrInWords(100, { suffixOnly: false })).toBe(
        'One Hundred Rupees',
      );
      expect(formatInrInWords(undefined, { empty: '' })).toBe('');
    });
  });

  describe('formatIndianNumber', () => {
    it('uses Indian grouping', () => {
      expect(formatIndianNumber(1234567.8, { maximumFractionDigits: 1 })).toBe(
        '12,34,567.8',
      );
      expect(formatIndianNumber(null)).toBe(EMPTY_DISPLAY);
    });
  });

  describe('formatPercentage', () => {
    it('appends % and handles edges', () => {
      expect(formatPercentage(null)).toBe(EMPTY_DISPLAY);
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(12.5)).toBe('12.50%');
      expect(formatPercentage(-1)).toBe('-1.00%');
    });
  });

  describe('formatQuantity', () => {
    it('trims trailing zeros by default', () => {
      expect(formatQuantity(null)).toBe(EMPTY_DISPLAY);
      expect(formatQuantity(0)).toBe('0');
      expect(formatQuantity(1.5)).toBe('1.5');
      expect(formatQuantity(1234.5)).toBe('1,234.5');
      expect(formatQuantity(1.5, { fixed: true, maximumFractionDigits: 3 })).toBe(
        '1.500',
      );
    });
  });

  describe('date / time (Asia/Kolkata)', () => {
    // Fixed UTC instant: 2026-07-20T00:30:00.000Z → 06:00 IST on 20 Jul 2026
    const utcMorning = '2026-07-20T00:30:00.000Z';

    it('formats date and time in IST', () => {
      expect(formatDate(utcMorning)).toBe('20 Jul 2026');
      expect(formatTime(utcMorning)).toMatch(/6:00\s*am/i);
      expect(formatDateTime(utcMorning)).toMatch(/20 Jul 2026/);
      expect(toIsoDateString(utcMorning)).toBe('2026-07-20');
    });

    it('handles null and invalid', () => {
      expect(formatDate(null)).toBe(EMPTY_DISPLAY);
      expect(formatDateTime('not-a-date')).toBe(EMPTY_DISPLAY);
      expect(toIsoDateString(undefined)).toBe('');
    });

    it('converts across midnight IST boundary', () => {
      // 2026-07-19T20:00:00Z = 20 Jul 2026 01:30 IST
      expect(formatDate('2026-07-19T20:00:00.000Z')).toBe('20 Jul 2026');
      expect(toIsoDateString('2026-07-19T20:00:00.000Z')).toBe('2026-07-20');
    });

    it('matches date snapshot', () => {
      expect({
        date: formatDate(utcMorning),
        dateTime: formatDateTime(utcMorning),
        time: formatTime(utcMorning),
        iso: toIsoDateString(utcMorning),
      }).toMatchSnapshot();
    });
  });

  describe('financial year', () => {
    it('resolves April FY windows', () => {
      const mid = getFinancialYear('2026-08-15T10:00:00.000Z');
      expect(mid?.label).toBe('FY 2026-27');
      expect(mid?.startYear).toBe(2026);

      const beforeApril = getFinancialYear('2026-03-15T10:00:00.000Z');
      expect(beforeApril?.label).toBe('FY 2025-26');

      const onApril = getFinancialYear('2026-04-01T00:00:00+05:30');
      expect(onApril?.label).toBe('FY 2026-27');
    });

    it('formats labels and null safely', () => {
      expect(formatFinancialYear('2026-12-01')).toBe('FY 2026-27');
      expect(formatFinancialYear(null)).toBe(EMPTY_DISPLAY);
      expect(formatFinancialYearFromStart(2026)).toBe('FY 2026-27');
      expect(formatFinancialYearFromStart(-1)).toBe(EMPTY_DISPLAY);
    });

    it('matches FY snapshot', () => {
      expect({
        aug: formatFinancialYear('2026-08-01T00:00:00+05:30'),
        mar: formatFinancialYear('2026-03-31T12:00:00+05:30'),
        fromStart: formatFinancialYearFromStart(2025),
      }).toMatchSnapshot();
    });
  });
});
