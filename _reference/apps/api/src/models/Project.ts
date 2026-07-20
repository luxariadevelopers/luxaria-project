import mongoose, { Schema, Types } from 'mongoose';
import type { ProjectStage } from '@luxaria/shared';

export interface IProject {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  location?: string;
  stage: ProjectStage;
  proposedBudgetPaise: number;
  proposedBoqPaise: number;
  builtUpAreaSqft: number;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    location: String,
    stage: {
      type: String,
      enum: ['LAND', 'FOUNDATION', 'STRUCTURE', 'FINISHING', 'HANDOVER', 'COMPLETED'],
      default: 'LAND',
    },
    proposedBudgetPaise: { type: Number, default: 0 },
    proposedBoqPaise: { type: Number, default: 0 },
    builtUpAreaSqft: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
