const DEPARTMENT_CODES: Record<string, string> = {
  'Board & Executive': 'EXE',
  'Engineering & Construction': 'ENG',
  'Project Management': 'PM',
  'Architecture & Design': 'ARCH',
  'Quantity Surveying & Estimation': 'QS',
  'Planning & Scheduling': 'PLN',
  'MEP Services': 'MEP',
  'Procurement & Contracts': 'PROC',
  'Materials & Stores': 'STOR',
  'Quality Assurance & Control': 'QA',
  'Health, Safety & Environment': 'HSE',
  'Land, Legal & Liaison': 'LEG',
  'Sales & CRM': 'SALE',
  'Customer Relations & Handover': 'CRM',
  'Marketing & Business Development': 'MKT',
  'Finance & Accounts': 'FIN',
  'Billing & Collections': 'BILL',
  'Human Resources': 'HR',
  Administration: 'ADM',
  'IT & Systems': 'IT',
  'Facility Management': 'FM',
  // legacy seeds / free-text
  Engineering: 'ENG',
  Finance: 'FIN',
  Procurement: 'PROC',
  Sales: 'SALE',
  HR: 'HR',
  Admin: 'ADM',
};

const STOP_WORDS = new Set([
  'and',
  'of',
  'the',
  'a',
  'an',
  '&',
  '/',
]);

/** Build a short uppercase code from a display name. */
export function toEmploymentCode(name: string, maxLen = 4): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[–—]/g, ' ')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return 'GEN';

  const words = cleaned
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()));

  if (words.length === 0) return 'GEN';
  if (words.length === 1) {
    return words[0]!.slice(0, maxLen).toUpperCase();
  }

  const initials = words.map((word) => word[0]!.toUpperCase()).join('');
  return initials.slice(0, maxLen);
}

export function departmentEmploymentCode(
  department: string | null | undefined,
): string | null {
  const name = department?.trim();
  if (!name) return null;
  return DEPARTMENT_CODES[name] ?? toEmploymentCode(name, 4);
}

export function designationEmploymentCode(
  designation: string | null | undefined,
): string | null {
  const name = designation?.trim();
  if (!name) return null;
  return toEmploymentCode(name, 4);
}

/**
 * Employee ID format: `{DEPT}-{DESIG}-{######}`
 * Example: Engineering & Construction + Site Engineer + 42 → `ENG-SE-000042`
 */
export function formatEmployeeId(
  department: string | null | undefined,
  designation: string | null | undefined,
  sequence: number,
): string {
  const dept = departmentEmploymentCode(department) ?? 'GEN';
  const desig = designationEmploymentCode(designation) ?? 'GEN';
  const seq = Math.max(0, Math.floor(sequence));
  return `${dept}-${desig}-${String(seq).padStart(6, '0')}`;
}

/** Preview without a committed sequence (UI only). */
export function previewEmployeeId(
  department: string | null | undefined,
  designation: string | null | undefined,
): string {
  const dept = departmentEmploymentCode(department);
  const desig = designationEmploymentCode(designation);
  if (!dept || !desig) return '';
  return `${dept}-${desig}-······`;
}
