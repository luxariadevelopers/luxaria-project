import { apiGet, apiPost } from '@/api/client';
import type {
  CreateStockTransferInput,
  MaterialUnit,
  StockTransfer,
  StockTransferItem,
  StockTransferScope,
  StockTransferStatus,
} from './types';

const BASE = '/stock-transfers';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseItem(item: StockTransferItem): StockTransferItem {
  return {
    id: String(item.id),
    materialId: String(item.materialId),
    unit: item.unit as MaterialUnit,
    quantity: Number(item.quantity ?? 0),
    baseUnitQuantity: Number(item.baseUnitQuantity ?? 0),
    batch: item.batch ?? null,
    serialNumbers: item.serialNumbers ?? [],
    sourceLedgerId:
      item.sourceLedgerId == null ? null : String(item.sourceLedgerId),
    destLedgerId: item.destLedgerId == null ? null : String(item.destLedgerId),
  };
}

function normaliseTransfer(row: StockTransfer): StockTransfer {
  return {
    ...row,
    id: String(row.id),
    transferNumber: row.transferNumber,
    scope: row.scope as StockTransferScope,
    sourceProjectId: String(row.sourceProjectId),
    destProjectId: String(row.destProjectId),
    sourceWarehouseId:
      row.sourceWarehouseId == null ? null : String(row.sourceWarehouseId),
    destWarehouseId:
      row.destWarehouseId == null ? null : String(row.destWarehouseId),
    sourceSiteId: row.sourceSiteId == null ? null : String(row.sourceSiteId),
    destSiteId: row.destSiteId == null ? null : String(row.destSiteId),
    sourceLocation: row.sourceLocation ?? '',
    destLocation: row.destLocation ?? '',
    transferDate: toIso(row.transferDate) ?? String(row.transferDate),
    items: (row.items ?? []).map(normaliseItem),
    status: row.status as StockTransferStatus,
    notes: row.notes ?? null,
    createdBy: String(row.createdBy),
    postedBy: row.postedBy == null ? null : String(row.postedBy),
    postedAt: toIso(row.postedAt),
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

/** `GET /stock-transfers` — Nest `stock.view` */
export async function listStockTransfers(
  projectId: string,
): Promise<StockTransfer[]> {
  const res = await apiGet<StockTransfer[]>(BASE, { projectId });
  return (res.data ?? []).map(normaliseTransfer);
}

/** `POST /stock-transfers` — Nest `stock.transfer` */
export async function createStockTransfer(
  input: CreateStockTransferInput,
): Promise<StockTransfer> {
  const res = await apiPost<StockTransfer>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create transfer');
  }
  return normaliseTransfer(res.data);
}

/** `POST /stock-transfers/:id/post` — Nest `stock.adjust` */
export async function postStockTransfer(id: string): Promise<StockTransfer> {
  const res = await apiPost<StockTransfer>(
    `${BASE}/${encodeURIComponent(id)}/post`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to post transfer');
  }
  return normaliseTransfer(res.data);
}

export type { StockTransfer } from './types';
