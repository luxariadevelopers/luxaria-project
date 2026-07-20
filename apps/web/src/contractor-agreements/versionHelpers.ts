import {
  ContractorAgreementStatus,
  type PublicContractorAgreement,
} from './types';

const OPEN_STATUSES: readonly ContractorAgreementStatus[] = [
  ContractorAgreementStatus.Draft,
  ContractorAgreementStatus.PendingApproval,
  ContractorAgreementStatus.Rejected,
];

/** Only `active` agreements can be amended (Nest `POST /:id/amend`). */
export function canAmendAgreement(
  agreement: Pick<PublicContractorAgreement, 'status'>,
): boolean {
  return agreement.status === ContractorAgreementStatus.Active;
}

/** One open draft/pending/rejected version per agreement number. */
export function hasOpenAgreementVersion(
  versions: readonly Pick<PublicContractorAgreement, 'status'>[],
): boolean {
  return versions.some((row) => OPEN_STATUSES.includes(row.status));
}

export function assertCanStartAmendment(input: {
  source: Pick<PublicContractorAgreement, 'status'>;
  versions: readonly Pick<PublicContractorAgreement, 'status'>[];
}): { ok: true } | { ok: false; message: string } {
  if (!canAmendAgreement(input.source)) {
    return {
      ok: false,
      message: 'Only active agreements can be amended.',
    };
  }
  if (hasOpenAgreementVersion(input.versions)) {
    return {
      ok: false,
      message:
        'An open draft, pending, or rejected version already exists for this agreement number.',
    };
  }
  return { ok: true };
}

export function sortVersionsDesc(
  versions: readonly PublicContractorAgreement[],
): PublicContractorAgreement[] {
  return [...versions].sort((a, b) => b.version - a.version);
}

export function pickActiveVersion(
  versions: readonly PublicContractorAgreement[],
): PublicContractorAgreement | null {
  return (
    versions.find((row) => row.status === ContractorAgreementStatus.Active) ??
    null
  );
}

export function nextAgreementVersion(
  versions: readonly Pick<PublicContractorAgreement, 'version'>[],
): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((row) => row.version)) + 1;
}

export function isEditableAgreementStatus(
  status: ContractorAgreementStatus,
): boolean {
  return (
    status === ContractorAgreementStatus.Draft ||
    status === ContractorAgreementStatus.Rejected
  );
}
