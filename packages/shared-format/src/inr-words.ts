import { EMPTY_DISPLAY, toFiniteNumber, type EmptyDisplayOptions } from './nullish';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const;

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const;

/** Convert 0–999 to words (no trailing space). */
function underThousand(n: number): string {
  if (n <= 0) return '';
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return one ? `${TENS[ten]} ${ONES[one]}` : TENS[ten]!;
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return rest
    ? `${ONES[hundred]} Hundred ${underThousand(rest)}`
    : `${ONES[hundred]} Hundred`;
}

/**
 * Indian grouping: crore / lakh / thousand / remainder.
 * Supports non-negative integers up to 999 crore (9 digits beyond crore unit).
 */
function integerToIndianWords(n: number): string {
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(' ');
}

export type InrWordsOptions = EmptyDisplayOptions & {
  /** Append "Only" (cheque-style). Default true. */
  suffixOnly?: boolean;
};

/**
 * Spell an INR amount in Indian English words (crore / lakh).
 * Amounts are expected in **rupees** (not paise). Paise from fractional rupees.
 *
 * Examples:
 * - `8` → `Eight Rupees Only`
 * - `100000` → `One Lakh Rupees Only`
 * - `12.5` → `Twelve Rupees and Fifty Paise Only`
 */
export function formatInrInWords(
  value: unknown,
  options: InrWordsOptions = {},
): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  const negative = n < 0;
  const abs = Math.abs(n);
  // Round to paise (2 dp) to match money fields.
  const totalPaise = Math.round(abs * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  const parts: string[] = [];
  parts.push(
    rupees === 0 && paise > 0
      ? ''
      : `${integerToIndianWords(rupees)} ${rupees === 1 ? 'Rupee' : 'Rupees'}`,
  );
  if (paise > 0) {
    parts.push(
      `${integerToIndianWords(paise)} ${paise === 1 ? 'Paisa' : 'Paise'}`,
    );
  }

  const body = parts.filter(Boolean).join(' and ');
  const withSign = negative ? `Minus ${body}` : body;
  const suffixOnly = options.suffixOnly !== false;
  return suffixOnly ? `${withSign} Only` : withSign;
}
