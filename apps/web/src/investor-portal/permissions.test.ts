import { describe, expect, it } from 'vitest';
import {
  canDownloadInvestorDocuments,
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
});
