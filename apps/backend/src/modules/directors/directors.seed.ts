import { LUXARIA_AUTHORISED_SHARE_CAPITAL } from '../company/company.seed';

/** ₹10 face value — authorised capital ₹1,00,00,000 ⇒ 10,00,000 shares */
export const DEFAULT_FACE_VALUE = 10;

export const TOTAL_SHARES =
  LUXARIA_AUTHORISED_SHARE_CAPITAL / DEFAULT_FACE_VALUE;

export const SHARES_PER_DIRECTOR = TOTAL_SHARES / 4; // 2,50,000
export const PERCENTAGE_PER_DIRECTOR = 25;

/**
 * Four placeholder directors — each 25% company shareholding.
 * Company shareholding is separate from project investment.
 */
export const DIRECTOR_PLACEHOLDER_SEEDS = [
  {
    fullName: 'Director One',
    din: '10000001',
    pan: 'AAAAA1111A',
    email: 'director1@luxariadevelopers.com',
    phone: null as string | null,
  },
  {
    fullName: 'Director Two',
    din: '10000002',
    pan: 'BBBBB2222B',
    email: 'director2@luxariadevelopers.com',
    phone: null as string | null,
  },
  {
    fullName: 'Director Three',
    din: '10000003',
    pan: 'CCCCC3333C',
    email: 'director3@luxariadevelopers.com',
    phone: null as string | null,
  },
  {
    fullName: 'Director Four',
    din: '10000004',
    pan: 'DDDDD4444D',
    email: 'director4@luxariadevelopers.com',
    phone: null as string | null,
  },
] as const;
