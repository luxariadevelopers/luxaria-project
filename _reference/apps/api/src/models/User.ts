import mongoose, { Schema, Types } from 'mongoose';
import type { Role } from '@luxaria/shared';

export interface IUser {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: Role;
  projectIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phone: String,
    role: {
      type: String,
      enum: ['ADMIN', 'DIRECTOR', 'INVESTOR', 'FINANCE', 'PURCHASE', 'MANAGER', 'SITE_ENGINEER'],
      required: true,
    },
    projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
