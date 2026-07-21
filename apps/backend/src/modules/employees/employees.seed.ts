export type DepartmentSeed = {
  code: string;
  name: string;
  description?: string;
};

export type DesignationSeed = {
  code: string;
  name: string;
  departmentCode: string;
  defaultRoleCode?: string | null;
  reportingLevel?: number | null;
  mobileEligible?: boolean;
};

export const DEPARTMENT_SEEDS: DepartmentSeed[] = [
  {
    code: 'ENGINEERING',
    name: 'Engineering',
    description: 'Site engineering and construction delivery',
  },
  {
    code: 'FINANCE',
    name: 'Finance',
    description: 'Accounting, treasury, and financial control',
  },
  {
    code: 'PROCUREMENT',
    name: 'Procurement',
    description: 'Purchasing and vendor management',
  },
  {
    code: 'SALES',
    name: 'Sales',
    description: 'Unit sales and customer relations',
  },
  {
    code: 'HR',
    name: 'Human Resources',
    description: 'People operations',
  },
  {
    code: 'ADMIN',
    name: 'Administration',
    description: 'Corporate administration',
  },
];

export const DESIGNATION_SEEDS: DesignationSeed[] = [
  {
    code: 'SITE_ENGINEER',
    name: 'Site Engineer',
    departmentCode: 'ENGINEERING',
    defaultRoleCode: 'SITE_ENGINEER',
    reportingLevel: 3,
    mobileEligible: true,
  },
  {
    code: 'SITE_SUPERVISOR',
    name: 'Site Supervisor',
    departmentCode: 'ENGINEERING',
    defaultRoleCode: 'SITE_SUPERVISOR',
    reportingLevel: 4,
    mobileEligible: true,
  },
  {
    code: 'PROJECT_MANAGER',
    name: 'Project Manager',
    departmentCode: 'ENGINEERING',
    defaultRoleCode: 'PROJECT_MANAGER',
    reportingLevel: 2,
    mobileEligible: true,
  },
  {
    code: 'STOREKEEPER',
    name: 'Storekeeper',
    departmentCode: 'PROCUREMENT',
    defaultRoleCode: 'STOREKEEPER',
    reportingLevel: 4,
    mobileEligible: true,
  },
  {
    code: 'ACCOUNTANT',
    name: 'Accountant',
    departmentCode: 'FINANCE',
    defaultRoleCode: 'ACCOUNTANT',
    reportingLevel: 3,
    mobileEligible: false,
  },
];
