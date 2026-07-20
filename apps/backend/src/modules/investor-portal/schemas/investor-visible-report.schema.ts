import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type InvestorVisibleReportDocument =
  HydratedDocument<InvestorVisibleReport>;

export enum InvestorVisibleReportStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export enum InvestorVisibleReportType {
  Progress = 'progress',
  FinancialSummary = 'financial_summary',
  BoardUpdate = 'board_update',
  Other = 'other',
}

/**
 * Project reports explicitly approved for investor portal visibility.
 * Never include vendor/customer PII in title/summary.
 */
@Schema({
  collection: 'investor_visible_reports',
  timestamps: true,
})
export class InvestorVisibleReport {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({
    type: String,
    enum: InvestorVisibleReportType,
    required: true,
    index: true,
  })
  reportType!: InvestorVisibleReportType;

  @Prop({ type: String, trim: true, default: null })
  summary!: string | null;

  @Prop({ type: String, trim: true, default: null })
  documentPath!: string | null;

  @Prop({
    type: String,
    enum: InvestorVisibleReportStatus,
    required: true,
    default: InvestorVisibleReportStatus.Draft,
    index: true,
  })
  status!: InvestorVisibleReportStatus;

  @Prop({ type: Date, default: null, index: true })
  publishedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  publishedBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvestorVisibleReportSchema = SchemaFactory.createForClass(
  InvestorVisibleReport,
);

InvestorVisibleReportSchema.plugin(baseSchemaPlugin);
InvestorVisibleReportSchema.plugin(softDeletePlugin);
InvestorVisibleReportSchema.index({ projectId: 1, status: 1, publishedAt: -1 });
