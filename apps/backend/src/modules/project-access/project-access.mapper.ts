import type { Types } from 'mongoose';
import type {
  ProjectAccessStatus,
  ProjectTeamRole,
} from './schemas/project-assignment.schema';

export type PublicProjectAssignment = {
  id: string;
  userId: string;
  projectId: string | null;
  globalAccess: boolean;
  accessStartDate: Date;
  accessEndDate: Date | null;
  status: ProjectAccessStatus;
  notes: string | null;
  teamRole: ProjectTeamRole | null;
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
  teamRole?: ProjectTeamRole | null;
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
    teamRole: assignment.teamRole ?? null,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
