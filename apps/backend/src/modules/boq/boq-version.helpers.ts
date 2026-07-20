import { BadRequestException } from '@nestjs/common';
import {
  BoqVersionStatus,
  BoqVersionType,
  type BoqVersion,
} from './schemas/boq.schema';

export const EDITABLE_BOQ_VERSION_STATUSES: BoqVersionStatus[] = [
  BoqVersionStatus.Draft,
  BoqVersionStatus.Rejected,
];

export const IMMUTABLE_BOQ_VERSION_STATUSES: BoqVersionStatus[] = [
  BoqVersionStatus.PendingApproval,
  BoqVersionStatus.Active,
  BoqVersionStatus.Superseded,
];

export function assertBoqVersionEditable(version: {
  status: BoqVersionStatus;
  versionNumber?: number;
}): void {
  if (!EDITABLE_BOQ_VERSION_STATUSES.includes(version.status)) {
    throw new BadRequestException(
      `BOQ version${
        version.versionNumber != null ? ` v${version.versionNumber}` : ''
      } is immutable (status=${version.status})`,
    );
  }
}

export function assertVariationRequiresApproval(
  version: Pick<BoqVersion, 'versionType' | 'status'>,
): void {
  if (
    version.versionType === BoqVersionType.Variation &&
    version.status !== BoqVersionStatus.PendingApproval
  ) {
    throw new BadRequestException(
      'Variation versions require approval before they can become active',
    );
  }
}

export function requiresApprovalToActivate(versionType: BoqVersionType): boolean {
  return versionType === BoqVersionType.Variation;
}
