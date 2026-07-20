import mongoose, { Schema, Types } from 'mongoose';

export interface ILabourContract {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  contractorName: string;
  phone?: string;
  plan: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  agreedHeadcount: number;
  ratePaise: number;
  agreementFileId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendance {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  labourContractId: Types.ObjectId;
  date: Date;
  masonCount: number;
  labourCount: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LabourContractSchema = new Schema<ILabourContract>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    contractorName: { type: String, required: true },
    phone: String,
    plan: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], default: 'DAILY' },
    agreedHeadcount: { type: Number, required: true },
    ratePaise: { type: Number, default: 0 },
    agreementFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    labourContractId: { type: Schema.Types.ObjectId, ref: 'LabourContract', required: true },
    date: { type: Date, required: true },
    masonCount: { type: Number, default: 0 },
    labourCount: { type: Number, default: 0 },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ labourContractId: 1, date: 1 }, { unique: true });

export const LabourContract = mongoose.model<ILabourContract>('LabourContract', LabourContractSchema);
export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
