import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DepartmentDocument = HydratedDocument<Department>;

export enum DepartmentStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'departments',
  timestamps: true,
})
export class Department {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: DepartmentStatus,
    default: DepartmentStatus.Active,
    index: true,
  })
  status!: DepartmentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  headUserId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.plugin(baseSchemaPlugin);
DepartmentSchema.plugin(softDeletePlugin);

DepartmentSchema.index(
  { companyId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
