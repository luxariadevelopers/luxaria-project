import { describe, expect, it, beforeEach } from 'vitest';
import {
  SITE_ENGINEER_WIZARD_DRAFT_KEY,
  clearSiteEngineerWizardDraft,
  loadSiteEngineerWizardDraft,
  parseSiteEngineerWizardDraft,
  saveSiteEngineerWizardDraft,
  toDraftValues,
} from './siteEngineerWizardDraft';
import { defaultEnabledModules } from './siteEngineerAccessModules';

const sample = toDraftValues({
  firstName: 'Asha',
  lastName: 'Kumar',
  displayName: '',
  email: 'asha@luxaria.dev',
  mobile: '9999999999',
  employeeCode: '',
  departmentId: 'dept-1',
  designationId: 'desig-1',
  reportingOfficerUserIds: ['u1', 'u2'],
  reportingManagerUserId: 'u1',
  reportingApprovalMode: 'any',
  createLogin: true,
  enabledModules: { ...defaultEnabledModules(), dashboards: false },
  projectId: 'proj-1',
  siteId: 'site-1',
});

describe('siteEngineerWizardDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips through sessionStorage without passwords', () => {
    saveSiteEngineerWizardDraft({ activeStep: 3, values: sample });
    const loaded = loadSiteEngineerWizardDraft();
    expect(loaded?.activeStep).toBe(3);
    expect(loaded?.values.email).toBe('asha@luxaria.dev');
    expect(loaded?.values.reportingOfficerUserIds).toEqual(['u1', 'u2']);
    expect(loaded?.values.enabledModules.dashboards).toBe(false);
    expect(sessionStorage.getItem(SITE_ENGINEER_WIZARD_DRAFT_KEY)).not.toMatch(
      /password/i,
    );
  });

  it('rejects invalid payloads', () => {
    expect(parseSiteEngineerWizardDraft(null)).toBeNull();
    expect(parseSiteEngineerWizardDraft({ v: 99 })).toBeNull();
  });

  it('clears draft', () => {
    saveSiteEngineerWizardDraft({ activeStep: 1, values: sample });
    clearSiteEngineerWizardDraft();
    expect(loadSiteEngineerWizardDraft()).toBeNull();
  });
});
