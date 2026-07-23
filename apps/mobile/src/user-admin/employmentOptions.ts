import type { SelectOption } from '@luxaria/shared-types';

/**
 * Real-estate / construction org catalog for user Employment fields.
 * Values are stored as display names on `User.department` / `User.designation`.
 */
export const USER_DEPARTMENT_NAMES = [
  'Board & Executive',
  'Engineering & Construction',
  'Project Management',
  'Architecture & Design',
  'Quantity Surveying & Estimation',
  'Planning & Scheduling',
  'MEP Services',
  'Procurement & Contracts',
  'Materials & Stores',
  'Quality Assurance & Control',
  'Health, Safety & Environment',
  'Land, Legal & Liaison',
  'Sales & CRM',
  'Customer Relations & Handover',
  'Marketing & Business Development',
  'Finance & Accounts',
  'Billing & Collections',
  'Human Resources',
  'Administration',
  'IT & Systems',
  'Facility Management',
] as const;

/** Designations keyed by department name. */
export const USER_DESIGNATIONS_BY_DEPARTMENT: Record<
  string,
  readonly string[]
> = {
  'Board & Executive': [
    'Chairman',
    'Vice Chairman',
    'Managing Director',
    'Joint Managing Director',
    'Executive Director',
    'Non-Executive Director',
    'Independent Director',
    'Whole-time Director',
    'Chief Executive Officer',
    'Chief Operating Officer',
    'Chief Financial Officer',
    'Chief Technical Officer',
    'Chief Projects Officer',
    'Chief Marketing Officer',
    'Chief Business Officer',
    'Chief Human Resources Officer',
    'Chief Legal Officer',
    'Chief Strategy Officer',
    'President',
    'Vice President',
    'Senior Vice President',
    'Group Director',
    'Director – Operations',
    'Director – Projects',
    'Director – Finance',
    'Director – Sales',
    'Director – Business Development',
    'Company Promoter',
  ],
  'Engineering & Construction': [
    'Chief Engineer',
    'General Manager – Construction',
    'Construction Manager',
    'Project Engineer',
    'Senior Site Engineer',
    'Site Engineer',
    'Junior Site Engineer',
    'Site Supervisor',
    'Foreman',
    'Civil Engineer',
    'Structural Engineer',
    'Finishing Engineer',
    'Billing Engineer',
    'Surveyor',
    'Draftsman',
  ],
  'Project Management': [
    'Director – Projects',
    'General Manager – Projects',
    'Project Director',
    'Senior Project Manager',
    'Project Manager',
    'Assistant Project Manager',
    'Project Coordinator',
    'Project Controls Manager',
    'PMO Analyst',
  ],
  'Architecture & Design': [
    'Chief Architect',
    'Principal Architect',
    'Senior Architect',
    'Architect',
    'Junior Architect',
    'Interior Designer',
    'Landscape Architect',
    'BIM Manager',
    'BIM Coordinator',
    'CAD Technician',
  ],
  'Quantity Surveying & Estimation': [
    'Chief Quantity Surveyor',
    'Senior Quantity Surveyor',
    'Quantity Surveyor',
    'Junior Quantity Surveyor',
    'Estimation Manager',
    'Estimator',
    'Cost Controller',
    'Rate Analysis Engineer',
  ],
  'Planning & Scheduling': [
    'Planning Manager',
    'Senior Planning Engineer',
    'Planning Engineer',
    'Scheduler',
    'Look-Ahead Planner',
    'Progress Monitoring Engineer',
  ],
  'MEP Services': [
    'MEP Head',
    'MEP Manager',
    'MEP Engineer',
    'Electrical Engineer',
    'Mechanical Engineer',
    'Plumbing Engineer',
    'HVAC Engineer',
    'ELV Engineer',
    'MEP Supervisor',
  ],
  'Procurement & Contracts': [
    'Head of Procurement',
    'Procurement Manager',
    'Senior Purchase Executive',
    'Purchase Executive',
    'Contracts Manager',
    'Contracts Administrator',
    'Vendor Development Manager',
    'Tendering Manager',
  ],
  'Materials & Stores': [
    'Stores Manager',
    'Senior Storekeeper',
    'Storekeeper',
    'Material Controller',
    'Inventory Officer',
    'Warehouse In-charge',
    'Material Receiving Clerk',
  ],
  'Quality Assurance & Control': [
    'QA/QC Head',
    'QA/QC Manager',
    'Senior QA/QC Engineer',
    'QA/QC Engineer',
    'Quality Inspector',
    'NCR Coordinator',
  ],
  'Health, Safety & Environment': [
    'HSE Head',
    'HSE Manager',
    'Senior Safety Officer',
    'Safety Officer',
    'EHS Engineer',
    'Environmental Officer',
  ],
  'Land, Legal & Liaison': [
    'Legal Head',
    'Legal Manager',
    'Company Secretary',
    'Liaison Manager',
    'Liaison Officer',
    'RERA Compliance Officer',
    'Land Acquisition Manager',
    'Title Verification Officer',
  ],
  'Sales & CRM': [
    'Sales Head',
    'Sales Manager',
    'Senior Sales Executive',
    'Sales Executive',
    'CRM Manager',
    'CRM Executive',
    'Channel Partner Manager',
    'Pre-sales Engineer',
  ],
  'Customer Relations & Handover': [
    'Customer Relations Head',
    'Customer Relations Manager',
    'Customer Care Executive',
    'Handover Manager',
    'Handover Engineer',
    'Snagging Coordinator',
    'Possession Officer',
  ],
  'Marketing & Business Development': [
    'Marketing Head',
    'Marketing Manager',
    'Brand Manager',
    'Digital Marketing Manager',
    'Business Development Manager',
    'Business Development Executive',
    'Content & Communications Lead',
  ],
  'Finance & Accounts': [
    'Chief Financial Officer',
    'Finance Controller',
    'Finance Manager',
    'Accounts Manager',
    'Senior Accountant',
    'Accountant',
    'Junior Accountant',
    'Treasury Manager',
    'Audit Coordinator',
  ],
  'Billing & Collections': [
    'Billing Head',
    'Billing Manager',
    'Billing Executive',
    'Collections Manager',
    'Collections Executive',
    'Invoice Coordinator',
    'Payment Follow-up Officer',
  ],
  'Human Resources': [
    'HR Head',
    'HR Manager',
    'HR Business Partner',
    'HR Executive',
    'Talent Acquisition Manager',
    'Payroll Officer',
    'Training & Development Officer',
  ],
  Administration: [
    'Admin Head',
    'Admin Manager',
    'Admin Executive',
    'Office Manager',
    'Front Office Executive',
    'Transport Coordinator',
    'Pantry & Facilities Supervisor',
  ],
  'IT & Systems': [
    'IT Head',
    'IT Manager',
    'Systems Administrator',
    'ERP Administrator',
    'Software Engineer',
    'Helpdesk Executive',
    'Data Analyst',
  ],
  'Facility Management': [
    'Facility Manager',
    'Facility Supervisor',
    'Maintenance Engineer',
    'Housekeeping Supervisor',
    'Security Coordinator',
    'Amenity Manager',
  ],
};

const EMPTY_OPTION: SelectOption = { value: '', label: 'Not assigned' };

function withLegacyOption(
  options: SelectOption[],
  currentValue?: string | null,
): SelectOption[] {
  const current = currentValue?.trim();
  if (!current) return options;
  if (options.some((option) => option.value === current)) return options;
  return [
    ...options,
    { value: current, label: `${current} (current)` },
  ];
}

export function departmentSelectOptions(
  currentValue?: string | null,
): SelectOption[] {
  return withLegacyOption(
    [
      EMPTY_OPTION,
      ...USER_DEPARTMENT_NAMES.map((name) => ({
        value: name,
        label: name,
      })),
    ],
    currentValue,
  );
}

export function designationSelectOptions(
  department: string | null | undefined,
  currentValue?: string | null,
): SelectOption[] {
  const dept = department?.trim() ?? '';
  const names = dept ? (USER_DESIGNATIONS_BY_DEPARTMENT[dept] ?? []) : [];
  return withLegacyOption(
    [
      EMPTY_OPTION,
      ...names.map((name) => ({ value: name, label: name })),
    ],
    currentValue,
  );
}

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
};

const STOP_WORDS = new Set(['and', 'of', 'the', 'a', 'an', '&', '/']);

function toEmploymentCode(name: string, maxLen = 4): string {
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

  return words
    .map((word) => word[0]!.toUpperCase())
    .join('')
    .slice(0, maxLen);
}

/**
 * Live preview while department + designation are chosen.
 * Final sequence is assigned by the server on save (`ENG-SE-000042`).
 */
export function previewEmployeeId(
  department: string | null | undefined,
  designation: string | null | undefined,
): string {
  const deptName = department?.trim();
  const desigName = designation?.trim();
  if (!deptName || !desigName) return '';
  const dept = DEPARTMENT_CODES[deptName] ?? toEmploymentCode(deptName, 4);
  const desig = toEmploymentCode(desigName, 4);
  return `${dept}-${desig}-······`;
}
