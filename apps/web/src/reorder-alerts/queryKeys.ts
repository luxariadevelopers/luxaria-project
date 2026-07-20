import type { ForecastQuery, ListReorderAlertsQuery } from './types';

export const reorderAlertsKeys = {
  all: ['reorder-alerts'] as const,
  lists: () => [...reorderAlertsKeys.all, 'list'] as const,
  list: (query: ListReorderAlertsQuery) =>
    [...reorderAlertsKeys.lists(), query] as const,
  forecasts: () => [...reorderAlertsKeys.all, 'forecast'] as const,
  forecast: (query: ForecastQuery) =>
    [...reorderAlertsKeys.forecasts(), query] as const,
};
