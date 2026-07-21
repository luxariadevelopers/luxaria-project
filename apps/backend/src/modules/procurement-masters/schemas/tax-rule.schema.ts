import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { ProcurementMasterStatus } from './procurement-master-status';

export type TaxRuleDocument = HydratedDocument<TaxRule>;

@Schema({
  collection: 'tax_rules',
  timestamps: true,
})
export class TaxRule {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  gstPercent!: number;

  @Prop({
    type: String,
    enum: ProcurementMasterStatus,
    default: ProcurementMasterStatus.Active,
    index: true,
  })
  status!: ProcurementMasterStatus;
}

export const TaxRuleSchema = SchemaFactory.createForClass(TaxRule);

TaxRuleSchema.plugin(baseSchemaPlugin);
TaxRuleSchema.plugin(softDeletePlugin);

TaxRuleSchema.index(
  { companyId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
