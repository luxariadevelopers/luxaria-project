import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';

export type EquipmentOwnership = 'own' | 'hire';
export type EquipmentStatus =
  | 'available'
  | 'allocated'
  | 'maintenance'
  | 'breakdown'
  | 'retired';

export type Equipment = {
  id: string;
  projectId: string;
  companyId: string | null;
  code: string;
  name: string;
  type: string | null;
  category: string | null;
  ownership: EquipmentOwnership;
  status: EquipmentStatus;
  siteId: string | null;
  notes: string | null;
};

export type EquipmentUtilization = {
  id: string;
  equipmentId: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  date: string;
  hoursWorked: number;
  hoursIdle: number;
  notes: string | null;
};

export type CreateEquipmentInput = {
  projectId: string;
  companyId?: string | null;
  code: string;
  name: string;
  type?: string | null;
  category?: string | null;
  ownership: EquipmentOwnership;
  status?: EquipmentStatus;
  siteId?: string | null;
  notes?: string | null;
};

export type CreateUtilizationInput = {
  equipmentId: string;
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  date: string;
  hoursWorked: number;
  hoursIdle: number;
  notes?: string | null;
};

export async function listEquipment(projectId: string): Promise<Equipment[]> {
  const res = await apiGet<Equipment[]>('/equipment', { projectId });
  return res.data ?? [];
}

export async function getEquipment(id: string): Promise<Equipment> {
  const res = await apiGet<Equipment>(`/equipment/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to fetch equipment');
  return res.data;
}

export async function createEquipment(
  input: CreateEquipmentInput,
): Promise<Equipment> {
  const res = await apiPost<Equipment>('/equipment', input);
  if (!res.data) throw new Error(res.message || 'Failed to create equipment');
  return res.data;
}

export async function updateEquipment(
  id: string,
  input: Partial<CreateEquipmentInput>,
): Promise<Equipment> {
  const res = await apiPatch<Equipment>(`/equipment/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update equipment');
  return res.data;
}

export async function deleteEquipment(id: string): Promise<void> {
  await apiDelete(`/equipment/${id}`);
}

export async function postAllocation(
  id: string,
  body: {
    projectId: string;
    siteId?: string | null;
    fromDate: string;
    toDate?: string | null;
    notes?: string | null;
  },
): Promise<Equipment> {
  const res = await apiPost<Equipment>(`/equipment/${id}/allocations`, body);
  if (!res.data) throw new Error(res.message || 'Failed to record allocation');
  return res.data;
}

export async function postFuelLog(
  id: string,
  body: {
    date: string;
    quantity: number;
    cost?: number | null;
    notes?: string | null;
  },
): Promise<Equipment> {
  const res = await apiPost<Equipment>(`/equipment/${id}/fuel`, body);
  if (!res.data) throw new Error(res.message || 'Failed to record fuel log');
  return res.data;
}

export async function postMaintenanceLog(
  id: string,
  body: {
    date: string;
    description: string;
    cost?: number | null;
    vendor?: string | null;
    notes?: string | null;
  },
): Promise<Equipment> {
  const res = await apiPost<Equipment>(`/equipment/${id}/maintenance`, body);
  if (!res.data) {
    throw new Error(res.message || 'Failed to record maintenance log');
  }
  return res.data;
}

export async function postBreakdownLog(
  id: string,
  body: {
    date: string;
    description: string;
    resolvedAt?: string | null;
    resolution?: string | null;
    notes?: string | null;
  },
): Promise<Equipment> {
  const res = await apiPost<Equipment>(`/equipment/${id}/breakdown`, body);
  if (!res.data) {
    throw new Error(res.message || 'Failed to record breakdown log');
  }
  return res.data;
}

export async function createUtilization(
  input: CreateUtilizationInput,
): Promise<EquipmentUtilization> {
  const res = await apiPost<EquipmentUtilization>(
    '/equipment/utilization',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to record utilization');
  }
  return res.data;
}

export async function listUtilizationByDpr(
  dprId: string,
): Promise<EquipmentUtilization[]> {
  const res = await apiGet<EquipmentUtilization[]>('/equipment/utilization', {
    dprId,
  });
  return res.data ?? [];
}
