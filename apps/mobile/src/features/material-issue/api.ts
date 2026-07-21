import { apiGet, apiPost } from '@/api/client';
import type {
  CreateMaterialIssueInput,
  CreateMaterialReturnInput,
  ListMaterialIssuesQuery,
  MaterialIssueBoqItemOption,
  MaterialIssueContractorOption,
  MaterialIssueMaterialOption,
  MaterialIssueUserOption,
  PublicMaterialIssue,
} from './types';

const BASE = '/material-issues';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseIssue(row: PublicMaterialIssue): PublicMaterialIssue {
  return {
    ...row,
    issueDate: toIso(row.issueDate) ?? row.issueDate,
    submittedAt: toIso(row.submittedAt),
    confirmedAt: toIso(row.confirmedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
    contractorId: row.contractorId ?? null,
    blockId: row.blockId ?? null,
    floorId: row.floorId ?? null,
    notes: row.notes ?? null,
    storeLocation: row.storeLocation ?? '',
    items: (row.items ?? []).map((item) => ({
      ...item,
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      batch: item.batch ?? null,
      notes: item.notes ?? null,
      returnedBaseQuantity: Number(item.returnedBaseQuantity ?? 0),
      remainingBaseQuantity: Number(item.remainingBaseQuantity ?? 0),
      baseUnitQuantity: Number(item.baseUnitQuantity ?? 0),
      quantity: Number(item.quantity ?? 0),
      stockLedgerEntryId: item.stockLedgerEntryId ?? null,
    })),
    signatures: {
      recipientSignatureDocumentId:
        row.signatures?.recipientSignatureDocumentId ?? null,
      recipientSignatureChecksum:
        row.signatures?.recipientSignatureChecksum ?? null,
      issuerSignatureDocumentId:
        row.signatures?.issuerSignatureDocumentId ?? null,
      issuerSignatureChecksum: row.signatures?.issuerSignatureChecksum ?? null,
      recipientSignedAt: toIso(row.signatures?.recipientSignedAt ?? null),
    },
    returns: (row.returns ?? []).map((ret) => ({
      ...ret,
      returnDate: toIso(ret.returnDate) ?? ret.returnDate,
      postedAt: toIso(ret.postedAt),
      notes: ret.notes ?? null,
      items: (ret.items ?? []).map((item) => ({
        ...item,
        reason: item.reason ?? null,
        stockLedgerEntryId: item.stockLedgerEntryId ?? null,
        quantity: Number(item.quantity ?? 0),
        baseUnitQuantity: Number(item.baseUnitQuantity ?? 0),
      })),
    })),
  };
}

/** `POST /material-issues` — `stock.issue` */
export async function createMaterialIssue(
  input: CreateMaterialIssueInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `GET /material-issues` — `stock.view` */
export async function listMaterialIssues(
  query: ListMaterialIssuesQuery = {},
): Promise<PublicMaterialIssue[]> {
  const res = await apiGet<PublicMaterialIssue[]>(BASE, {
    page: query.page ?? 1,
    limit: query.limit ?? 50,
    search: query.search,
    projectId: query.projectId,
    status: query.status,
    contractorId: query.contractorId,
    boqItemId: query.boqItemId,
  });
  return (res.data ?? []).map(normaliseIssue);
}

/** `GET /material-issues/:id` — `stock.view` */
export async function getMaterialIssue(
  id: string,
): Promise<PublicMaterialIssue> {
  const res = await apiGet<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material issue unavailable');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/returns` — `stock.issue` */
export async function createMaterialReturn(
  id: string,
  input: CreateMaterialReturnInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/returns`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create material return failed');
  }
  return normaliseIssue(res.data);
}

/** `GET /users` — `user.view` (recipient / returnedBy picker) */
export async function listUsersForReturn(params?: {
  projectId?: string;
}): Promise<MaterialIssueUserOption[]> {
  const res = await apiGet<MaterialIssueUserOption[]>('/users', {
    page: 1,
    limit: 100,
    status: 'active',
    projectId: params?.projectId,
  });
  return res.data ?? [];
}

/** `GET /materials` — `material.view` */
export async function listMaterialsForIssue(params?: {
  search?: string;
}): Promise<MaterialIssueMaterialOption[]> {
  const res = await apiGet<Array<Record<string, unknown>>>('/materials', {
    page: 1,
    limit: 50,
    search: params?.search,
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    materialCode: String(row.materialCode ?? row.code ?? ''),
    materialName: String(row.materialName ?? row.name ?? ''),
    baseUnit: row.baseUnit ? String(row.baseUnit) : undefined,
  }));
}

/** `GET /boq/projects/:projectId/items` — `boq.view` */
export async function listBoqItemsForIssue(query: {
  projectId: string;
  search?: string;
  limit?: number;
}): Promise<MaterialIssueBoqItemOption[]> {
  const res = await apiGet<MaterialIssueBoqItemOption[]>(
    `/boq/projects/${encodeURIComponent(query.projectId)}/items`,
    {
      search: query.search,
      page: 1,
      limit: query.limit ?? 50,
      status: 'active',
    },
  );
  return (res.data ?? []).map((row) => ({
    id: row.id,
    boqCode: row.boqCode,
    description: row.description,
    unit: row.unit,
  }));
}

/** `GET /contractors` — `contractor.view` */
export async function listContractorsForIssue(params?: {
  search?: string;
  limit?: number;
}): Promise<MaterialIssueContractorOption[]> {
  const res = await apiGet<MaterialIssueContractorOption[]>('/contractors', {
    search: params?.search,
    page: 1,
    limit: params?.limit ?? 50,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    contractorCode: row.contractorCode,
    legalName: row.legalName,
  }));
}
