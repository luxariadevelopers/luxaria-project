import type { Types } from 'mongoose';
import type {
  CostCentreKind,
  CostCentreStatus,
} from './schemas/cost-centre.schema';

export type PublicCostCentre = {
  id: string;
  code: string;
  name: string;
  kind: CostCentreKind;
  companyId: string | null;
  projectId: string | null;
  parentId: string | null;
  status: CostCentreStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicCostCentre(row: {
  _id: Types.ObjectId | string;
  code: string;
  name: string;
  kind: CostCentreKind;
  companyId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  parentId?: Types.ObjectId | string | null;
  status: CostCentreStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCostCentre {
  return {
    id: String(row._id),
    code: row.code,
    name: row.name,
    kind: row.kind,
    companyId: oid(row.companyId),
    projectId: oid(row.projectId),
    parentId: oid(row.parentId),
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
