import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';

export type RateContractScope = 'company' | 'project';
export type RateContractStatus =
  | 'draft'
  | 'active'
  | 'expired'
  | 'superseded'
  | 'terminated';

export type RateContractBoqItemRate = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: string;
  rate: number;
  remarks: string | null;
};

export type RateContract = {
  id: string;
  contractNumber: string;
  version: number;
  supersedesId: string | null;
  companyId: string | null;
  contractorId: string;
  projectId: string | null;
  scope: RateContractScope;
  title: string | null;
  boqItemRates: RateContractBoqItemRate[];
  labourRates: Array<{
    id: string;
    skill: string;
    category: string | null;
    unit: string;
    rate: number;
  }>;
  materialInclusiveRates: Array<{
    id: string;
    description: string;
    unit: string;
    rate: number;
  }>;
  equipmentRates: Array<{
    id: string;
    equipmentType: string;
    unit: string;
    rate: number;
  }>;
  validityFrom: string;
  validityTo: string;
  retentionPercent: number;
  status: RateContractStatus;
  notes: string | null;
  createdAt?: string;
};

export type CreateRateContractInput = {
  contractorId: string;
  scope: RateContractScope;
  projectId?: string | null;
  title?: string | null;
  boqItemRates?: Array<{
    boqItemId?: string | null;
    boqCode?: string | null;
    description: string;
    unit: string;
    rate: number;
    remarks?: string | null;
  }>;
  labourRates?: Array<{
    skill: string;
    category?: string | null;
    unit: string;
    rate: number;
  }>;
  materialInclusiveRates?: Array<{
    description: string;
    unit: string;
    rate: number;
    includesMaterials?: string[];
  }>;
  equipmentRates?: Array<{
    equipmentType: string;
    unit: string;
    rate: number;
    withOperator?: boolean;
    fuelInclusive?: boolean;
  }>;
  validityFrom: string;
  validityTo: string;
  retentionPercent?: number;
  notes?: string | null;
};

export type ListRateContractsParams = {
  contractorId?: string;
  projectId?: string;
  scope?: RateContractScope;
  status?: RateContractStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export async function listRateContracts(
  params: ListRateContractsParams = {},
): Promise<RateContract[]> {
  const res = await apiGet<RateContract[]>('/rate-contracts', params);
  return res.data ?? [];
}

export async function listRateContractsByContractor(
  contractorId: string,
  params: Omit<ListRateContractsParams, 'contractorId'> = {},
): Promise<RateContract[]> {
  const res = await apiGet<RateContract[]>(
    `/rate-contracts/by-contractor/${contractorId}`,
    params,
  );
  return res.data ?? [];
}

export async function listRateContractsByProject(
  projectId: string,
  params: Omit<ListRateContractsParams, 'projectId'> = {},
): Promise<RateContract[]> {
  const res = await apiGet<RateContract[]>(
    `/rate-contracts/by-project/${projectId}`,
    params,
  );
  return res.data ?? [];
}

export async function getRateContract(id: string): Promise<RateContract> {
  const res = await apiGet<RateContract>(`/rate-contracts/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to load rate contract');
  return res.data;
}

export async function createRateContract(
  input: CreateRateContractInput,
): Promise<RateContract> {
  const res = await apiPost<RateContract>('/rate-contracts', input);
  if (!res.data) throw new Error(res.message || 'Failed to create rate contract');
  return res.data;
}

export async function updateRateContract(
  id: string,
  input: Partial<CreateRateContractInput>,
): Promise<RateContract> {
  const res = await apiPatch<RateContract>(`/rate-contracts/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update rate contract');
  return res.data;
}

export async function activateRateContract(id: string): Promise<RateContract> {
  const res = await apiPost<RateContract>(`/rate-contracts/${id}/activate`, {});
  if (!res.data) throw new Error(res.message || 'Failed to activate rate contract');
  return res.data;
}

export async function supersedeRateContract(
  id: string,
  input: Partial<CreateRateContractInput> = {},
): Promise<RateContract> {
  const res = await apiPost<RateContract>(
    `/rate-contracts/${id}/supersede`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to supersede rate contract');
  }
  return res.data;
}

export async function terminateRateContract(
  id: string,
  reason: string,
): Promise<RateContract> {
  const res = await apiPost<RateContract>(`/rate-contracts/${id}/terminate`, {
    reason,
  });
  if (!res.data) {
    throw new Error(res.message || 'Failed to terminate rate contract');
  }
  return res.data;
}

export async function deleteRateContract(id: string): Promise<void> {
  await apiDelete(`/rate-contracts/${id}`);
}
