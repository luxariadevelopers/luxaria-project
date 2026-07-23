import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DirectorDocument = HydratedDocument<Director>;

export enum DirectorStatus {
  Active = 'active',
  Inactive = 'inactive',
  Resigned = 'resigned',
}

@Schema({
  collection: 'directors',
  timestamps: true,
})
export class Director {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  directorCode!: string;

  /** Linked system user — required for operational directors */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  fullName!: string;

  /** Director Identification Number */
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  din!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  address!: string | null;

  @Prop({ type: Date, default: null })
  appointmentDate!: Date | null;

  @Prop({
    type: String,
    enum: DirectorStatus,
    default: DirectorStatus.Active,
    index: true,
  })
  status!: DirectorStatus;

  @Prop({ type: Boolean, default: false })
  isPlaceholder!: boolean;
}

export const DirectorSchema = SchemaFactory.createForClass(Director);

DirectorSchema.plugin(baseSchemaPlugin);
DirectorSchema.plugin(softDeletePlugin);

DirectorSchema.index({ companyId: 1, status: 1 });
DirectorSchema.index({ fullName: 'text', directorCode: 'text', din: 'text' });
DirectorSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: 'objectId' },
      isDeleted: false,
    },
  },
);
DirectorSchema.index(
  { din: 1 },
  {
    unique: true,
    partialFilterExpression: { din: { $type: 'string' }, isDeleted: false },
  },
);
