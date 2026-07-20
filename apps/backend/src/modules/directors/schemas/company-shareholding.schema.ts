import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CompanyShareholdingDocument = HydratedDocument<CompanyShareholding>;

/**
 * Company equity shareholding (NOT project investment).
 * Rows are versioned: never overwrite numberOfShares / percentage on past rows.
 * Close a version by setting effectiveTo; insert a new row for the next version.
 */
@Schema({
  collection: 'company_shareholdings',
  timestamps: true,
})
export class CompanyShareholding {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Director', required: true, index: true })
  directorId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  /** Null while this version is the active holding for the director */
  @Prop({ type: Date, default: null, index: true })
  effectiveTo!: Date | null;

  @Prop({ type: Number, required: true, min: 0 })
  numberOfShares!: number;

  /** Face value per share in INR */
  @Prop({ type: Number, required: true, min: 0 })
  faceValue!: number;

  /** Ownership percentage 0–100 */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percentage!: number;

  @Prop({ type: String, trim: true, default: null })
  approvalReference!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'DirectorFile', default: null })
  documentId!: Types.ObjectId | null;

  /** Version number within company shareholding history (monotonic) */
  @Prop({ type: Number, required: true, min: 1, index: true })
  version!: number;

  @Prop({ type: Types.ObjectId, ref: 'ShareholdingChangeRequest', default: null })
  changeRequestId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyShareholdingSchema =
  SchemaFactory.createForClass(CompanyShareholding);

CompanyShareholdingSchema.plugin(baseSchemaPlugin);
CompanyShareholdingSchema.plugin(softDeletePlugin);

CompanyShareholdingSchema.index({ companyId: 1, directorId: 1, effectiveFrom: -1 });
CompanyShareholdingSchema.index({ companyId: 1, effectiveTo: 1, version: -1 });
CompanyShareholdingSchema.index(
  { companyId: 1, directorId: 1 },
  {
    name: 'one_active_holding_per_director',
    unique: true,
    partialFilterExpression: {
      effectiveTo: null,
      isDeleted: false,
    },
  },
);
