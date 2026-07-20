import {
  BoqVersionStatus,
  BoqVersionType,
  type PublicBoqVersion,
} from './types';

/** Nest unique partial index: only one `active` version per project. */
export function countActiveBoqVersions(
  versions: readonly PublicBoqVersion[],
): number {
  return versions.filter((v) => v.status === BoqVersionStatus.Active).length;
}

export function findActiveBoqVersion(
  versions: readonly PublicBoqVersion[],
): PublicBoqVersion | null {
  return (
    versions.find((v) => v.status === BoqVersionStatus.Active) ?? null
  );
}

/** Variation cannot use `/activate` — must submit then approve. */
export function requiresApprovalToActivate(
  versionType: BoqVersionType,
): boolean {
  return versionType === BoqVersionType.Variation;
}

export function canDirectActivateVersion(version: PublicBoqVersion): boolean {
  if (requiresApprovalToActivate(version.versionType)) {
    return false;
  }
  return (
    version.status === BoqVersionStatus.Draft ||
    version.status === BoqVersionStatus.Rejected
  );
}

/**
 * Client preview: activating this version would leave exactly one active
 * (current actives become superseded server-side).
 */
export function previewActivationActiveCount(
  versions: readonly PublicBoqVersion[],
  activatingId: string,
): number {
  const othersActive = versions.filter(
    (v) =>
      v.id !== activatingId && v.status === BoqVersionStatus.Active,
  ).length;
  return othersActive === 0 ? 1 : othersActive;
}
