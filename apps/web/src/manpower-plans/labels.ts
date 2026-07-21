import {
  ManpowerPlanSource,
  type ManpowerPlanSource as Source,
} from './types';

export function manpowerPlanSourceLabel(source: Source): string {
  switch (source) {
    case ManpowerPlanSource.Manual:
      return 'Manual';
    case ManpowerPlanSource.AgreementDefault:
      return 'Agreement default';
    case ManpowerPlanSource.Copied:
      return 'Copied';
    default:
      return source;
  }
}
