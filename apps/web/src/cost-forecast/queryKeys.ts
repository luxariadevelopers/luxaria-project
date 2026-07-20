import type { CostForecastQuery } from './types';

export const costForecastQueryKey = (query: CostForecastQuery) =>
  ['cost-forecast', query] as const;
