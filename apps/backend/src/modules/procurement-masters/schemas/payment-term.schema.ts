import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { ProcurementMasterStatus } from './procurement-master-status';

export type PaymentTermDocument = HydratedDocument<PaymentTerm>;

@Schema({
  collection: 'payment_terms',
  timestamps: true,
})
export class PaymentTerm {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 0 })
  days!: number;

  @Prop({
    type: String,
    enum: ProcurementMasterStatus,
    default: ProcurementMasterStatus.Active,
    index: true,
  })
  status!: ProcurementMasterStatus;
}

export const PaymentTermSchema = SchemaFactory.createForClass(PaymentTerm);

PaymentTermSchema.plugin(baseSchemaPlugin);
PaymentTermSchema.plugin(softDeletePlugin);

PaymentTermSchema.index(
  { companyId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
