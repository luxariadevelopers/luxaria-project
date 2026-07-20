import { describe, expect, it } from 'vitest';
import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
  type PublicProjectParticipant,
} from '@/project-participants/types';
import {
  buildAllocationSchedule,
  sumProposedProfitShare,
} from './buildAllocationSchedule';

function row(
  overrides: Partial<PublicProjectParticipant> &
    Pick<
      PublicProjectParticipant,
      'id' | 'participantKey' | 'approvedProfitSharePercentage' | 'status' | 'version'
    >,
): PublicProjectParticipant {
  return {
    projectId: 'p1',
    participantType: ParticipantType.Director,
    participantId: 'd1',
    participantLabel: overrides.participantLabel ?? 'Director A',
    commitmentAmount: 1_000_000,
    expectedContributionDate: null,
    actualContributionAmount: 0,
    lossSharePercentage: overrides.lossSharePercentage ?? overrides.approvedProfitSharePercentage,
    interestRate: null,
    instrumentType: InstrumentType.EquityContribution,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    agreementDocumentId: null,
    supersedesId: null,
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    notes: null,
    ...overrides,
  };
}

describe('buildAllocationSchedule', () => {
  it('keeps approved immutable and overlays draft proposed %', () => {
    const active = [
      row({
        id: 'a1',
        participantKey: 'director:d1',
        approvedProfitSharePercentage: 40,
        status: ParticipantApprovalStatus.Approved,
        version: 1,
      }),
      row({
        id: 'a2',
        participantKey: 'director:d2',
        participantLabel: 'Director B',
        participantId: 'd2',
        approvedProfitSharePercentage: 60,
        status: ParticipantApprovalStatus.Approved,
        version: 1,
      }),
    ];
    const pending = [
      row({
        id: 'd1',
        participantKey: 'director:d1',
        approvedProfitSharePercentage: 45,
        status: ParticipantApprovalStatus.Draft,
        version: 2,
        supersedesId: 'a1',
      }),
    ];

    const lines = buildAllocationSchedule({ active, pending });
    expect(lines).toHaveLength(2);
    const a = lines.find((l) => l.participantKey === 'director:d1')!;
    expect(a.approvedProfitShare).toBe(40);
    expect(a.proposedProfitShare).toBe(45);
    expect(a.deltaProfitShare).toBe(5);
    expect(a.isEditable).toBe(true);
    expect(sumProposedProfitShare(lines)).toBe(105);
  });

  it('picks the latest pending version per key', () => {
    const lines = buildAllocationSchedule({
      active: [
        row({
          id: 'a1',
          participantKey: 'director:d1',
          approvedProfitSharePercentage: 100,
          status: ParticipantApprovalStatus.Approved,
          version: 1,
        }),
      ],
      pending: [
        row({
          id: 'old',
          participantKey: 'director:d1',
          approvedProfitSharePercentage: 10,
          status: ParticipantApprovalStatus.Draft,
          version: 2,
        }),
        row({
          id: 'new',
          participantKey: 'director:d1',
          approvedProfitSharePercentage: 25,
          status: ParticipantApprovalStatus.Draft,
          version: 3,
        }),
      ],
    });
    expect(lines[0]?.pending?.id).toBe('new');
    expect(lines[0]?.proposedProfitShare).toBe(25);
  });
});
