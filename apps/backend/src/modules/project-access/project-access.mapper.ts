import type { Types } from 'mongoose';
import type { ProjectAccessStatus } from './schemas/project-assignment.schema';

export type PublicProjectAssignment = {
  id: string;
  userId: string;
  projectId: string | null;
  globalAccess: boolean;
  accessStartDate: Date;
  accessEndDate: Date | null;
  status: ProjectAccessStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AssignmentLike = {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  globalAccess?: boolean;
  accessStartDate: Date;
  accessEndDate?: Date | null;
  status: ProjectAccessStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicAssignment(assignment: AssignmentLike): PublicProjectAssignment {
  return {
    id: String(assignment._id),
    userId: String(assignment.userId),
    projectId: assignment.projectId ? String(assignment.projectId) : null,
    globalAccess: Boolean(assignment.globalAccess),
    accessStartDate: assignment.accessStartDate,
    accessEndDate: assignment.accessEndDate ?? null,
    status: assignment.status,
    notes: assignment.notes ?? null,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
