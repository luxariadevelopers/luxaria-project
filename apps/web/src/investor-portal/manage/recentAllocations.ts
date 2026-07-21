import type { RecentProfitAllocationRow } from './types';

const STORAGE_KEY = 'luxaria:investor-portal:recent-profit-allocations';

type Store = Record<string, RecentProfitAllocationRow[]>;

function readStore(): Store {
  if (typeof sessionStorage === 'undefined') {
    return {};
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listRecentProfitAllocations(
  projectId: string,
): RecentProfitAllocationRow[] {
  return readStore()[projectId] ?? [];
}

export function upsertRecentProfitAllocation(
  row: RecentProfitAllocationRow,
): RecentProfitAllocationRow[] {
  const store = readStore();
  const existing = store[row.projectId] ?? [];
  const next = [
    row,
    ...existing.filter((item) => item.id !== row.id),
  ].slice(0, 20);
  store[row.projectId] = next;
  writeStore(store);
  return next;
}

export function patchRecentProfitAllocationDistributed(
  projectId: string,
  allocationId: string,
  distributedAmount: number,
  undistributedAmount: number,
): RecentProfitAllocationRow[] {
  const store = readStore();
  const existing = store[projectId] ?? [];
  const next = existing.map((row) =>
    row.id === allocationId
      ? { ...row, distributedAmount, undistributedAmount }
      : row,
  );
  store[projectId] = next;
  writeStore(store);
  return next;
}
