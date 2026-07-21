import { describe, expect, it } from 'vitest';
import {
  canDownloadInvestorDocuments,
  canManageInvestorPortal,
  canViewInvestorDocuments,
} from './permissions';

describe('investor portal permission aliases', () => {
  it('maps investor.document.view to investor_portal.view', () => {
    expect(canViewInvestorDocuments((code) => code === 'investor_portal.view')).toBe(
      true,
    );
    expect(canViewInvestorDocuments(() => false)).toBe(false);
  });

  it('maps investor.document.download to investor_portal.view + document.download', () => {
    expect(
      canDownloadInvestorDocuments(
        (code) => code === 'investor_portal.view' || code === 'document.download',
      ),
    ).toBe(true);
    expect(
      canDownloadInvestorDocuments((code) => code === 'investor_portal.view'),
    ).toBe(false);
  });

  it('maps staff manage to investor_portal.manage', () => {
    expect(
      canManageInvestorPortal((code) => code === 'investor_portal.manage'),
    ).toBe(true);
    expect(canManageInvestorPortal(() => false)).toBe(false);
  });
});
