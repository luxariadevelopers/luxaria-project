import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type MeasurementBookEntryDocument =
  HydratedDocument<MeasurementBookEntry>;

/**
 * Formal Measurement Book register (Phase 6 W5).
 * Billing quantity source of truth — linked to WO / DPR / WM.
 * Corrections create revision documents; certified rows are never silently edited.
 */
export enum MeasurementBookStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Acknowledged = 'acknowledged',
  Verified = 'verified',
  Certified = 'certified',
  Rejected = 'rejected',
  Superseded = 'superseded',
  Cancelled = 'cancelled',
}

/** Site hierarchy location (structure nodes are Site docs). */
@Schema({ _id: false })
export class MbSiteLocation {
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  siteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  phaseId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  blockId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  towerId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  floorId!: Types.ObjectId | null;

  /** Free-text fallback (grid / bay / room). */
  @Prop({ type: String, trim: true, default: null, maxlength: 240 })
  locationLabel!: string | null;
}

export const MbSiteLocationSchema =
  SchemaFactory.createForClass(MbSiteLocation);

@Schema({
  collection: 'measurement_book_entries',
  timestamps: true,
})
export class MeasurementBookEntry {
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  entryNumber!: string;

  /** Revision sequence within the same entryNumber lineage (1 = original). */
  @Prop({ type: Number, required: true, min: 1, default: 1 })
  revision!: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', required: true, index: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  /**
   * Optional Work Order link (W4 module). Stored as ObjectId even when
   * WorkOrder collection is not yet registered — no hard FK enforcement.
   */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  workOrderId!: Types.ObjectId | null;

  /** Optional source work-measurement sheet. */
  @Prop({
    type: Types.ObjectId,
    ref: 'WorkMeasurement',
    default: null,
    index: true,
  })
  workMeasurementId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'DailyProgressReport',
    default: null,
    index: true,
  })
  dprId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Drawing', default: null, index: true })
  drawingId!: Types.ObjectId | null;

  /** Denormalised root site for access scoping (mirrors location.siteId). */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ type: MbSiteLocationSchema, required: true })
  location!: MbSiteLocation;

  /** Length (L). */
  @Prop({ type: Number, default: null, min: 0 })
  length!: number | null;

  /** Breadth (B). */
  @Prop({ type: Number, default: null, min: 0 })
  breadth!: number | null;

  /** Height / depth (H). */
  @Prop({ type: Number, default: null, min: 0 })
  height!: number | null;

  @Prop({ type: Number, required: true, min: 0, default: 1 })
  numberOfUnits!: number;

  /** L×B×H×nos (null dims treated as 1 when any dim present). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  calculatedQuantity!: number;

  /** Optional formula expression label (e.g. "L*B*H/2"). */
  @Prop({ type: String, trim: true, default: null, maxlength: 240 })
  formula!: string | null;

  /** Quantity from formula evaluation (takes precedence over calculated). */
  @Prop({ type: Number, default: null, min: 0 })
  formulaQuantity!: number | null;

  /** Final billable quantity for this entry. */
  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Date, required: true, index: true })
  periodFrom!: Date;

  @Prop({ type: Date, required: true, index: true })
  periodTo!: Date;

  @Prop({ type: Date, required: true, index: true })
  measurementDate!: Date;

  @Prop({ type: String, trim: true, default: null, maxlength: 2000 })
  workDescription!: string | null;

  @Prop({ type: String, trim: true, default: null, maxlength: 120 })
  sheetReference!: string | null;

  @Prop({ type: String, trim: true, default: null, maxlength: 2000 })
  notes!: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: MeasurementBookStatus,
    required: true,
    default: MeasurementBookStatus.Draft,
    index: true,
  })
  status!: MeasurementBookStatus;

  /** Prior revision this document corrects (null for original). */
  @Prop({
    type: Types.ObjectId,
    ref: 'MeasurementBookEntry',
    default: null,
    index: true,
  })
  supersedesId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'MeasurementBookEntry',
    default: null,
  })
  supersededById!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null, maxlength: 1000 })
  revisionReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  measuredBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  /** Contractor acknowledgement of engineer submission. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acknowledgedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  certifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  certifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null, maxlength: 1000 })
  rejectionReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MeasurementBookEntrySchema =
  SchemaFactory.createForClass(MeasurementBookEntry);

MeasurementBookEntrySchema.plugin(baseSchemaPlugin);
MeasurementBookEntrySchema.plugin(softDeletePlugin);

MeasurementBookEntrySchema.index(
  { entryNumber: 1, revision: 1 },
  {
    unique: true,
    name: 'uniq_mb_entry_revision',
    partialFilterExpression: { isDeleted: false },
  },
);
MeasurementBookEntrySchema.index({ projectId: 1, measurementDate: -1 });
MeasurementBookEntrySchema.index({ projectId: 1, status: 1 });
MeasurementBookEntrySchema.index({ projectId: 1, workOrderId: 1, status: 1 });
MeasurementBookEntrySchema.index({ projectId: 1, boqItemId: 1, status: 1 });
MeasurementBookEntrySchema.index({ workMeasurementId: 1, status: 1 });
MeasurementBookEntrySchema.index({ dprId: 1, status: 1 });
MeasurementBookEntrySchema.index({
  projectId: 1,
  periodFrom: 1,
  periodTo: 1,
});
