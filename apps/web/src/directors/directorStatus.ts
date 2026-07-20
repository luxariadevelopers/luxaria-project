import { DirectorStatus } from './types';

const LABELS: Record<DirectorStatus, string> = {
  [DirectorStatus.Active]: 'Active',
  [DirectorStatus.Inactive]: 'Inactive',
  [DirectorStatus.Resigned]: 'Resigned',
};

export function directorStatusLabel(status: string): string {
  if (status in LABELS) {
    return LABELS[status as DirectorStatus];
  }
  return status;
}

export const DIRECTOR_STATUS_OPTIONS = (
  Object.values(DirectorStatus) as DirectorStatus[]
).map((value) => ({
  value,
  label: LABELS[value],
}));
