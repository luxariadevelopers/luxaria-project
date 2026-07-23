/**
 * Module visibility for Site Engineer provision.
 * Unchecking a module denies its permission codes (user overrides), which hides
 * the matching web nav items and mobile Home tiles.
 */
export type SiteEngineerAccessModule = {
  id: string;
  label: string;
  description: string;
  /** Shown on web sidebar / dashboards */
  web: boolean;
  /** Shown on mobile Home */
  mobile: boolean;
  denyWhenDisabled: readonly string[];
};

export const SITE_ENGINEER_ACCESS_MODULES: readonly SiteEngineerAccessModule[] =
  [
    {
      id: 'dashboards',
      label: 'Dashboards & overview',
      description:
        'Web finance/site dashboards; mobile Executive summary, Finance, Director command centre',
      web: true,
      mobile: true,
      denyWhenDisabled: ['dashboard.view'],
    },
    {
      id: 'dpr',
      label: 'Daily progress (DPR)',
      description: 'Create and view daily progress reports',
      web: true,
      mobile: true,
      denyWhenDisabled: ['dpr.view', 'dpr.create'],
    },
    {
      id: 'measurement',
      label: 'Work measurement',
      description: 'Measurement books and work measurement entry',
      web: true,
      mobile: true,
      denyWhenDisabled: ['measurement.view', 'measurement.create'],
    },
    {
      id: 'attendance',
      label: 'Labour attendance',
      description: 'View and record site attendance',
      web: true,
      mobile: true,
      denyWhenDisabled: ['attendance.view', 'attendance.create'],
    },
    {
      id: 'expenses',
      label: 'Site expenses',
      description: 'View and create site expenses',
      web: true,
      mobile: true,
      denyWhenDisabled: ['expense.view', 'expense.create'],
    },
    {
      id: 'petty_cash',
      label: 'Petty cash',
      description: 'Petty cash requests and cash balance view',
      web: true,
      mobile: true,
      denyWhenDisabled: [
        'petty_cash.view',
        'petty_cash.request',
        'cash.view',
      ],
    },
    {
      id: 'purchase',
      label: 'Purchase requests',
      description: 'View purchase and raise purchase requests',
      web: true,
      mobile: true,
      denyWhenDisabled: ['purchase.view', 'purchase.request'],
    },
    {
      id: 'stock',
      label: 'Stock & materials',
      description: 'Stock ledger, issue, barcode, materials',
      web: true,
      mobile: true,
      denyWhenDisabled: [
        'stock.view',
        'stock.issue',
        'stock.barcode',
        'stock.reserve',
        'material.view',
        'material_consumption.view',
      ],
    },
    {
      id: 'work_orders',
      label: 'Work orders',
      description: 'View and create work orders',
      web: true,
      mobile: true,
      denyWhenDisabled: ['work_order.view', 'work_order.create'],
    },
    {
      id: 'running_bills',
      label: 'Running bills',
      description: 'View, create, and verify running bills',
      web: true,
      mobile: false,
      denyWhenDisabled: [
        'running_bill.view',
        'running_bill.create',
        'running_bill.verify',
      ],
    },
    {
      id: 'manpower',
      label: 'Manpower planning',
      description: 'Manpower plans and shortfall views',
      web: true,
      mobile: false,
      denyWhenDisabled: [
        'manpower_plan.view',
        'manpower_plan.manage',
        'manpower_shortfall.view',
      ],
    },
    {
      id: 'drawings',
      label: 'Drawings',
      description: 'View and manage site drawings',
      web: true,
      mobile: false,
      denyWhenDisabled: ['drawing.view', 'drawing.manage'],
    },
    {
      id: 'equipment',
      label: 'Equipment',
      description: 'View and operate equipment',
      web: true,
      mobile: false,
      denyWhenDisabled: ['equipment.view', 'equipment.operate'],
    },
    {
      id: 'quality',
      label: 'Site quality',
      description: 'Quality checklists and inspections',
      web: true,
      mobile: false,
      denyWhenDisabled: ['site_quality.view', 'site_quality.manage'],
    },
    {
      id: 'safety',
      label: 'Safety',
      description: 'Safety observations and actions',
      web: true,
      mobile: false,
      denyWhenDisabled: ['safety.view', 'safety.manage'],
    },
    {
      id: 'site_issues',
      label: 'Site issues',
      description: 'Raise and assign site issues',
      web: true,
      mobile: false,
      denyWhenDisabled: [
        'site_issue.view',
        'site_issue.create',
        'site_issue.assign',
      ],
    },
    {
      id: 'site_diary',
      label: 'Site diary',
      description: 'Site diary entries',
      web: true,
      mobile: false,
      denyWhenDisabled: ['site_diary.view', 'site_diary.manage'],
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'View and upload project/site documents',
      web: true,
      mobile: false,
      denyWhenDisabled: ['document.view', 'document.upload'],
    },
    {
      id: 'contractors',
      label: 'Contractors & BOQ (view)',
      description: 'Contractor, agreement, BOQ, and rate contract views',
      web: true,
      mobile: false,
      denyWhenDisabled: [
        'contractor.view',
        'contractor_agreement.view',
        'contractor_recovery.view',
        'boq.view',
        'rate_contract.view',
      ],
    },
  ] as const;

export type SiteEngineerModuleId =
  (typeof SITE_ENGINEER_ACCESS_MODULES)[number]['id'];

export function defaultEnabledModules(): Record<string, boolean> {
  return Object.fromEntries(
    SITE_ENGINEER_ACCESS_MODULES.map((module) => [module.id, true]),
  );
}

/** Build deny overrides for every permission under disabled modules. */
export function buildPermissionDeniesFromModules(
  enabledModules: Record<string, boolean>,
): string[] {
  const denies = new Set<string>();
  for (const module of SITE_ENGINEER_ACCESS_MODULES) {
    if (enabledModules[module.id] === false) {
      for (const code of module.denyWhenDisabled) {
        denies.add(code);
      }
    }
  }
  return [...denies].sort();
}

/** All permission codes managed by the module-access checklist. */
export function moduleAccessCatalogPermissions(): string[] {
  const codes = new Set<string>();
  for (const module of SITE_ENGINEER_ACCESS_MODULES) {
    for (const code of module.denyWhenDisabled) {
      codes.add(code);
    }
  }
  return [...codes].sort();
}

/**
 * Derive checkbox state from active deny overrides.
 * A module is off if any of its permissions are denied.
 */
export function enabledModulesFromDenyPermissions(
  denyPermissions: readonly string[],
): Record<string, boolean> {
  const denied = new Set(denyPermissions);
  return Object.fromEntries(
    SITE_ENGINEER_ACCESS_MODULES.map((module) => [
      module.id,
      !module.denyWhenDisabled.some((code) => denied.has(code)),
    ]),
  );
}
