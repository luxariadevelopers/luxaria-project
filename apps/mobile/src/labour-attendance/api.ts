import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  ContractorOption,
  CreateLabourAttendanceInput,
  LabourCategoryOption,
  PublicLabourAttendance,
} from './types';

const BASE = '/labour-attendance';

/** `GET /labour-attendance` — `attendance.view` */
export async function listLabourAttendance(params: {
  projectId: string;
  attendanceDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PublicLabourAttendance[]> {
  const res = await apiGet<PublicLabourAttendance[]>(BASE, {
    projectId: params.projectId,
    attendanceDate: params.attendanceDate,
    status: params.status,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return res.data ?? [];
}

/** `GET /labour-attendance/:id` — `attendance.view` */
export async function getLabourAttendance(
  id: string,
): Promise<PublicLabourAttendance> {
  const res = await apiGet<PublicLabourAttendance>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Attendance not found');
  return res.data;
}

/** `POST /labour-attendance` — `attendance.create` */
export async function createLabourAttendance(
  input: CreateLabourAttendanceInput,
  idempotencyKey?: string,
): Promise<PublicLabourAttendance> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    data?: PublicLabourAttendance;
  }>(BASE, input, {
    headers: idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined,
  });
  if (!data.data) {
    throw new Error(data.message || 'Could not create attendance');
  }
  return data.data;
}

/** `POST /labour-attendance/:id/confirm` — `attendance.confirm` */
export async function confirmLabourAttendance(
  id: string,
  confirmationNotes?: string | null,
): Promise<PublicLabourAttendance> {
  const res = await apiPost<PublicLabourAttendance>(`${BASE}/${id}/confirm`, {
    confirmationNotes: confirmationNotes ?? null,
  });
  if (!res.data) throw new Error(res.message || 'Could not confirm attendance');
  return res.data;
}

/** `GET /labour-categories` — `labour_category.view` */
export async function listLabourCategories(): Promise<LabourCategoryOption[]> {
  const res = await apiGet<LabourCategoryOption[]>('/labour-categories', {
    page: 1,
    limit: 100,
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    categoryCode: String(
      (row as { categoryCode?: string }).categoryCode ?? '',
    ),
    categoryName: String((row as { name?: string }).name ?? ''),
  }));
}

/** `GET /contractors` — `contractor.view` */
export async function listContractorsForAttendance(params: {
  projectId?: string;
}): Promise<ContractorOption[]> {
  const res = await apiGet<ContractorOption[]>('/contractors', {
    page: 1,
    limit: 100,
    projectId: params.projectId,
    status: 'active',
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    contractorCode: String(
      (row as { contractorCode?: string }).contractorCode ?? '',
    ),
    legalName: String((row as { legalName?: string }).legalName ?? ''),
  }));
}
