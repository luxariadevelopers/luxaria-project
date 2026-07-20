import mongoose, { Schema, Types } from 'mongoose';

export interface IMaterial {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  unit: string;
  normPerSqft?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockMovement {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  materialId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  type: 'IN' | 'OUT' | 'ADJUST';
  qty: number;
  photoFileId?: Types.ObjectId;
  billFileId?: Types.ObjectId;
  notes?: string;
  lowStockAlert?: boolean;
  createdBy: Types.ObjectId;
  movementDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    normPerSqft: Number,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const StockMovementSchema = new Schema<IStockMovement>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUST'], required: true },
    qty: { type: Number, required: true },
    photoFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    billFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    notes: String,
    lowStockAlert: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movementDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Material = mongoose.model<IMaterial>('Material', MaterialSchema);
export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
