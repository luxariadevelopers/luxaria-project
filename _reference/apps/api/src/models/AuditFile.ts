import mongoose, { Schema, Types } from 'mongoose';

export type AuditDocType =
  | 'BILL'
  | 'GRN_PHOTO'
  | 'VOUCHER'
  | 'SIGNATURE'
  | 'AGREEMENT'
  | 'PAYMENT_RECEIPT'
  | 'GST_CHALLAN'
  | 'OTHER';

export interface IAuditFile {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  docType: AuditDocType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  storage: 'S3' | 'LOCAL';
  s3Bucket?: string;
  s3Key?: string;
  localPath?: string;
  retentionYears: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AuditFileSchema = new Schema<IAuditFile>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    docType: {
      type: String,
      enum: ['BILL', 'GRN_PHOTO', 'VOUCHER', 'SIGNATURE', 'AGREEMENT', 'PAYMENT_RECEIPT', 'GST_CHALLAN', 'OTHER'],
      required: true,
    },
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    storage: { type: String, enum: ['S3', 'LOCAL'], required: true },
    s3Bucket: String,
    s3Key: String,
    localPath: String,
    retentionYears: { type: Number, default: 15 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const AuditFile = mongoose.model<IAuditFile>('AuditFile', AuditFileSchema);
