import mongoose, { Schema, Types } from 'mongoose';

export interface ICompany {
  _id: Types.ObjectId;
  name: string;
  shareCapitalPaise: number;
  gstin?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    shareCapitalPaise: { type: Number, required: true },
    gstin: String,
    address: String,
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
