import { defaultEnabledModules } from './siteEngineerAccessModules';

export const SITE_ENGINEER_WIZARD_DRAFT_KEY =
  'luxaria.site-engineer-wizard.draft.v1';

const DRAFT_VERSION = 1;

/** Persisted wizard state (passwords never stored). */
export type SiteEngineerWizardDraftValues = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile: string;
  employeeCode: string;
  departmentId: string;
  designationId: string;
  reportingOfficerUserIds: string[];
  reportingManagerUserId: string;
  reportingApprovalMode: 'any' | 'all';
  createLogin: boolean;
  enabledModules: Record<string, boolean>;
  projectId: string;
  siteId: string;
};

export type SiteEngineerWizardDraft = {
  v: number;
  activeStep: number;
  values: SiteEngineerWizardDraftValues;
  savedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mergeEnabledModules(
  raw: unknown,
): Record<string, boolean> {
  const defaults = defaultEnabledModules();
  if (!isRecord(raw)) return defaults;
  const next = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (typeof raw[key] === 'boolean') {
      next[key] = raw[key] as boolean;
    }
  }
  return next;
}

export function parseSiteEngineerWizardDraft(
  raw: unknown,
): SiteEngineerWizardDraft | null {
  if (!isRecord(raw) || raw.v !== DRAFT_VERSION) return null;
  if (typeof raw.activeStep !== 'number' || !Number.isFinite(raw.activeStep)) {
    return null;
  }
  if (!isRecord(raw.values)) return null;

  const valuesRaw = raw.values;
  const reportingOfficerUserIds = Array.isArray(valuesRaw.reportingOfficerUserIds)
    ? valuesRaw.reportingOfficerUserIds.filter(
        (id): id is string => typeof id === 'string',
      )
    : [];

  const approvalMode =
    valuesRaw.reportingApprovalMode === 'all' ? 'all' : 'any';

  return {
    v: DRAFT_VERSION,
    activeStep: Math.max(0, Math.min(5, Math.floor(raw.activeStep))),
    savedAt:
      typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    values: {
      firstName: asString(valuesRaw.firstName),
      lastName: asString(valuesRaw.lastName),
      displayName: asString(valuesRaw.displayName),
      email: asString(valuesRaw.email),
      mobile: asString(valuesRaw.mobile),
      employeeCode: asString(valuesRaw.employeeCode),
      departmentId: asString(valuesRaw.departmentId),
      designationId: asString(valuesRaw.designationId),
      reportingOfficerUserIds,
      reportingManagerUserId: asString(valuesRaw.reportingManagerUserId),
      reportingApprovalMode: approvalMode,
      createLogin: asBoolean(valuesRaw.createLogin, true),
      enabledModules: mergeEnabledModules(valuesRaw.enabledModules),
      projectId: asString(valuesRaw.projectId),
      siteId: asString(valuesRaw.siteId),
    },
  };
}

export function loadSiteEngineerWizardDraft(): SiteEngineerWizardDraft | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SITE_ENGINEER_WIZARD_DRAFT_KEY);
    if (!raw) return null;
    return parseSiteEngineerWizardDraft(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveSiteEngineerWizardDraft(input: {
  activeStep: number;
  values: SiteEngineerWizardDraftValues;
}): void {
  if (typeof sessionStorage === 'undefined') return;
  const draft: SiteEngineerWizardDraft = {
    v: DRAFT_VERSION,
    activeStep: input.activeStep,
    values: input.values,
    savedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(
      SITE_ENGINEER_WIZARD_DRAFT_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearSiteEngineerWizardDraft(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SITE_ENGINEER_WIZARD_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Strip secrets before persistence. */
export function toDraftValues(values: {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile: string;
  employeeCode: string;
  departmentId: string;
  designationId: string;
  reportingOfficerUserIds: string[];
  reportingManagerUserId: string;
  reportingApprovalMode: 'any' | 'all';
  createLogin: boolean;
  enabledModules: Record<string, boolean>;
  projectId: string;
  siteId: string;
}): SiteEngineerWizardDraftValues {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    displayName: values.displayName,
    email: values.email,
    mobile: values.mobile,
    employeeCode: values.employeeCode,
    departmentId: values.departmentId,
    designationId: values.designationId,
    reportingOfficerUserIds: values.reportingOfficerUserIds,
    reportingManagerUserId: values.reportingManagerUserId,
    reportingApprovalMode: values.reportingApprovalMode,
    createLogin: values.createLogin,
    enabledModules: values.enabledModules,
    projectId: values.projectId,
    siteId: values.siteId,
  };
}
