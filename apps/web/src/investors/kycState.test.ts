import { describe, expect, it } from 'vitest';
import { investorUiState } from './kycState';
import {
  InvestorKycStatus,
  InvestorStatus,
  InvestorType,
  type InvestorListRow,
} from './types';

function row(
  overrides: Partial<InvestorListRow> = {},
): InvestorListRow {
  return {
    id: '1',
    investorCode: 'INV-1',
    investorType: InvestorType.Individual,
    legalName: 'Test Investor',
    pan: 'AAAAA1111A',
    gstin: null,
    cin: null,
    directorId: null,
    email: null,
    phone: null,
    kycStatus: InvestorKycStatus.Pending,
    status: InvestorStatus.PendingKyc,
    kycNotes: null,
    ...overrides,
  };
}

describe('investorUiState — KYC and blocked states', () => {
  it('marks rejected KYC as blocked for clean activation', () => {
    const state = investorUiState(
      row({
        kycStatus: InvestorKycStatus.Rejected,
        status: InvestorStatus.PendingKyc,
      }),
    );
    expect(state.kycRejected).toBe(true);
    expect(state.canActivate).toBe(false);
    expect(state.canReviewKyc).toBe(true);
  });

  it('marks inactive status as blocked', () => {
    const state = investorUiState(
      row({
        kycStatus: InvestorKycStatus.Verified,
        status: InvestorStatus.Inactive,
      }),
    );
    expect(state.statusBlocked).toBe(true);
    expect(state.canActivate).toBe(true);
    expect(state.canDeactivate).toBe(false);
  });

  it('allows activation only when KYC verified and not active', () => {
    expect(
      investorUiState(
        row({
          kycStatus: InvestorKycStatus.Verified,
          status: InvestorStatus.PendingKyc,
        }),
      ).canActivate,
    ).toBe(true);

    expect(
      investorUiState(
        row({
          kycStatus: InvestorKycStatus.Pending,
          status: InvestorStatus.PendingKyc,
        }),
      ).canActivate,
    ).toBe(false);

    expect(
      investorUiState(
        row({
          kycStatus: InvestorKycStatus.Verified,
          status: InvestorStatus.Active,
        }),
      ).canActivate,
    ).toBe(false);
  });

  it('allows deactivation only when active', () => {
    expect(
      investorUiState(
        row({
          kycStatus: InvestorKycStatus.Verified,
          status: InvestorStatus.Active,
        }),
      ).canDeactivate,
    ).toBe(true);
  });
});
