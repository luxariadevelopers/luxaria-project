import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchCustomer } from '@/customers/api';
import { customersKeys } from '@/customers/queryKeys';
import { fetchUnits } from '@/units/api';
import { unitsKeys } from '@/units/queryKeys';
import type { BookingRelatedLabels, PublicBooking } from './types';

/**
 * Resolve unit / customer display labels via existing Nest GETs
 * (`GET /units`, `GET /customers/:id`) — not part of the booking payload.
 */
export function useBookingLookups(
  rows: readonly PublicBooking[],
  options: {
    projectId: string | null;
    canViewUnits: boolean;
    canViewCustomers: boolean;
  },
): BookingRelatedLabels {
  const { projectId, canViewUnits, canViewCustomers } = options;

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

  const customerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.customerId) ids.add(row.customerId);
    }
    return [...ids].sort();
  }, [rows]);

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

    return { units, customers };
    // customerLabelsKey tracks resolved customer query data without depending on
    // the unstable useQueries array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [unitsQuery.data?.items, customerIds, customerLabelsKey]);
}
