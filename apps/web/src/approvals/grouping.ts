import type { PublicApprovalRequest } from './types';

export type ApprovalModuleGroup = {
  module: string;
  items: PublicApprovalRequest[];
};

/** Group list rows by `module` (stable alpha sort of module keys). */
export function groupApprovalsByModule(
  items: readonly PublicApprovalRequest[],
): ApprovalModuleGroup[] {
  const map = new Map<string, PublicApprovalRequest[]>();
  for (const item of items) {
    const key = item.module?.trim() || 'unknown';
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, groupItems]) => ({ module, items: groupItems }));
}
