import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteDocument = HydratedDocument<Site>;

export enum SiteType {
  Site = 'site',
  Warehouse = 'warehouse',
  Block = 'block',
  Tower = 'tower',
  Phase = 'phase',
  WorkArea = 'work_area',
}

export enum SiteStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'project_sites',
  timestamps: true,
})
export class Site {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  siteCode!: string;

  @Prop({ required: true, trim: true })
  siteName!: string;

  @Prop({ type: String, enum: SiteType, default: SiteType.Site })
  type!: SiteType;

  @Prop({ type: String, trim: true, default: null })
  address!: string | null;

  @Prop({
    type: String,
    enum: SiteStatus,
    default: SiteStatus.Active,
    index: true,
  })
  status!: SiteStatus;

  @Prop({ type: Date, default: null })
  startDate!: Date | null;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  siteManagerUserId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  warehouseRef!: string | null;

  @Prop({ type: Object, default: null })
  geo!: Record<string, unknown> | null;
}

export const SiteSchema = SchemaFactory.createForClass(Site);

SiteSchema.plugin(baseSchemaPlugin);
SiteSchema.plugin(softDeletePlugin);

SiteSchema.index(
  { companyId: 1, projectId: 1, siteCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

SiteSchema.index({ companyId: 1, projectId: 1, status: 1 });
SiteSchema.index({ projectId: 1, status: 1 });
