import { describe, expect, it } from 'vitest';
import { ContractorAgreementStatus } from './types';
import {
  assertCanStartAmendment,
  canAmendAgreement,
  hasOpenAgreementVersion,
  nextAgreementVersion,
  sortVersionsDesc,
} from './versionHelpers';

describe('versionHelpers', () => {
  it('allows amend only on active agreements', () => {
    expect(
      canAmendAgreement({ status: ContractorAgreementStatus.Active }),
    ).toBe(true);
    expect(
      canAmendAgreement({ status: ContractorAgreementStatus.Draft }),
    ).toBe(false);
  });

  it('detects open versions blocking amendment', () => {
    expect(
      hasOpenAgreementVersion([
        { status: ContractorAgreementStatus.Superseded },
        { status: ContractorAgreementStatus.Draft },
      ]),
    ).toBe(true);
    expect(
      hasOpenAgreementVersion([
        { status: ContractorAgreementStatus.Active },
        { status: ContractorAgreementStatus.Superseded },
      ]),
    ).toBe(false);
  });

  it('assertCanStartAmendment enforces active source and no open version', () => {
    expect(
      assertCanStartAmendment({
        source: { status: ContractorAgreementStatus.Active },
        versions: [{ status: ContractorAgreementStatus.Active }],
      }).ok,
    ).toBe(true);

    const blocked = assertCanStartAmendment({
      source: { status: ContractorAgreementStatus.Active },
      versions: [
        { status: ContractorAgreementStatus.Active },
        { status: ContractorAgreementStatus.Draft },
      ],
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.message).toMatch(/open draft/i);
    }
  });

  it('sorts versions descending and computes next version', () => {
    const sorted = sortVersionsDesc([
      { version: 1 } as never,
      { version: 3 } as never,
      { version: 2 } as never,
    ]);
    expect(sorted.map((row) => row.version)).toEqual([3, 2, 1]);
    expect(nextAgreementVersion([{ version: 2 }, { version: 4 }])).toBe(5);
  });
});
