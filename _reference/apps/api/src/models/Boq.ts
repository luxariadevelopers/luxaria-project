import mongoose, { Schema, Types } from 'mongoose';

export interface IBoqLine {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  category: string;
  description: string;
  proposedPaise: number;
  utilizedPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

const BoqLineSchema = new Schema<IBoqLine>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    proposedPaise: { type: Number, required: true },
    utilizedPaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BoqLine = mongoose.model<IBoqLine>('BoqLine', BoqLineSchema);
