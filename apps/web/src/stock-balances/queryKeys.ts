import type { ForecastQuery } from './types';

export const STOCK_BALANCES_QUERY_KEY = ['stock-balances'] as const;

export const stockBalancesKeys = {
  all: STOCK_BALANCES_QUERY_KEY,
  /** Project id is required in every key for isolation. */
  forecast: (projectId: string, query: Omit<ForecastQuery, 'projectId'>) =>
    [...STOCK_BALANCES_QUERY_KEY, 'forecast', projectId, query] as const,
  balance: (
    projectId: string,
    materialId: string,
    location: string,
  ) =>
    [
      ...STOCK_BALANCES_QUERY_KEY,
      'balance',
      projectId,
      materialId,
      location,
    ] as const,
  locationBalances: (projectId: string, location: string) =>
    [...STOCK_BALANCES_QUERY_KEY, 'location', projectId, location] as const,
};
