import { describe, expect, it } from 'vitest';
import {
  assertInvestorPortalApiPath,
  createForbiddenError,
  getInvestorAccessDeniedMessage,
  InvestorPortalApiPathError,
  isInvestorPortalForbidden,
  isProjectAccessDenied,
  isProjectAuthorised,
} from './access';

describe('assertInvestorPortalApiPath', () => {
  it('allows investor-portal endpoints', () => {
    expect(() => assertInvestorPortalApiPath('/investor-portal/me')).not.toThrow();
    expect(() =>
      assertInvestorPortalApiPath('/investor-portal/projects/abc123'),
    ).not.toThrow();
  });

  it('blocks staff /investors CRM endpoints', () => {
    expect(() => assertInvestorPortalApiPath('/investors')).toThrow(
      InvestorPortalApiPathError,
    );
    expect(() => assertInvestorPortalApiPath('/investors/abc/documents')).toThrow(
      /Staff investor API blocked/,
    );
  });

  it('blocks unrelated API prefixes', () => {
    expect(() => assertInvestorPortalApiPath('/projects')).toThrow(
      /Only investor-portal APIs are allowed/,
    );
  });
});

describe('horizontal project access helpers', () => {
  const allowed = ['project-a', 'project-b'];

  it('detects unauthorised project ids before fetch', () => {
    expect(isProjectAuthorised('project-a', allowed)).toBe(true);
    expect(isProjectAuthorised('project-other', allowed)).toBe(false);
    expect(isProjectAuthorised('', allowed)).toBe(false);
  });

  it('treats backend 403 as project access denied', () => {
    const error = createForbiddenError('Project access denied');
    expect(isProjectAccessDenied(error)).toBe(true);
    expect(isInvestorPortalForbidden(error)).toBe(true);
    expect(getInvestorAccessDeniedMessage(error)).toBe(
      'You do not have access to this project.',
    );
  });

  it('returns custom denial copy for forbidden responses', () => {
    const error = createForbiddenError('Forbidden');
    expect(
      getInvestorAccessDeniedMessage(error, 'This project is not linked.'),
    ).toBe('This project is not linked.');
  });
});
