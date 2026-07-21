import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchCustomer } from '@/customers/api';
import { customersKeys } from '@/customers/queryKeys';
import { fetchUnits } from '@/units/api';
import { unitsKeys } from '@/units/queryKeys';
import type {
  PaymentScheduleRelatedLabels,
} from './types';

type RowLike = {
  bookingId: string;
  customerId: string;
  scheduleNumber?: string;
  unitId?: string;
};

function collectIds(rows: readonly RowLike[]) {
  const bookingIds = new Set<string>();
  const customerIds = new Set<string>();
  const unitIds = new Set<string>();
  for (const row of rows) {
    if ('bookingId' in row && row.bookingId) bookingIds.add(row.bookingId);
    if ('customerId' in row && row.customerId) customerIds.add(row.customerId);
    if (row.unitId) unitIds.add(row.unitId);
  }
  return {
    bookingIds: [...bookingIds].sort(),
    customerIds: [...customerIds].sort(),
    unitIds: [...unitIds].sort(),
  };
}

/**
 * Resolve unit / customer display labels via existing Nest GETs.
 */
export function usePaymentScheduleLookups(
  rows: readonly RowLike[],
  options: {
    projectId: string | null;
    canViewUnits: boolean;
    canViewCustomers: boolean;
    bookingLabels?: Map<string, string>;
  },
): PaymentScheduleRelatedLabels {
  const { projectId, canViewUnits, canViewCustomers, bookingLabels } = options;
  const { customerIds } = collectIds(rows);

  const unitsQuery = useQuery({
    queryKey: unitsKeys.list({
      projectId: projectId ?? undefined,
      page: 1,
      limit: 100,
    }),
    queryFn: () =>
      fetchUnits({
        projectId: projectId ?? undefined,
        page: 1,
        limit: 100,
      }),
    enabled: canViewUnits && Boolean(projectId),
    staleTime: 60_000,
    retry: false,
  });

  const customerQueries = useQueries({
    queries: customerIds.map((id) => ({
      queryKey: customersKeys.detail(id),
      queryFn: () => fetchCustomer(id),
      enabled: canViewCustomers && Boolean(id),
      staleTime: 60_000,
      retry: false as const,
    })),
  });

  const customerLabelsKey = customerQueries
    .map((q, i) => {
      const id = customerIds[i] ?? '';
      if (!q.data) return `${id}:`;
      return `${id}:${q.data.fullName}:${q.data.customerCode ?? ''}`;
    })
    .join('|');

  return useMemo(() => {
    const units = new Map<string, string>();
    for (const unit of unitsQuery.data?.items ?? []) {
      units.set(unit.id, `${unit.block}-${unit.unitNumber}`);
    }

    const customers = new Map<string, string>();
    customerQueries.forEach((q, index) => {
      const id = customerIds[index];
      if (!id || !q.data) return;
      const label = q.data.customerCode
        ? `${q.data.fullName} (${q.data.customerCode})`
        : q.data.fullName;
      customers.set(id, label);
    });

    return {
      units,
      customers,
      bookings: bookingLabels ?? new Map<string, string>(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- customerLabelsKey tracks query data
  }, [unitsQuery.data?.items, customerIds, customerLabelsKey, bookingLabels]);
}
