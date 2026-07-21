import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { ProcurementMasterStatus } from './procurement-master-status';

export type PurchaseCategoryDocument = HydratedDocument<PurchaseCategory>;

@Schema({
  collection: 'purchase_categories',
  timestamps: true,
})
export class PurchaseCategory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: ProcurementMasterStatus,
    default: ProcurementMasterStatus.Active,
    index: true,
  })
  status!: ProcurementMasterStatus;
}

export const PurchaseCategorySchema =
  SchemaFactory.createForClass(PurchaseCategory);

PurchaseCategorySchema.plugin(baseSchemaPlugin);
PurchaseCategorySchema.plugin(softDeletePlugin);

PurchaseCategorySchema.index(
  { companyId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
