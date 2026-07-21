import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type AnalyticsAlertDocument = HydratedDocument<AnalyticsAlert>;

export enum AnalyticsAlertSeverity {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
}

export enum AnalyticsAlertStatus {
  Open = 'open',
  Acknowledged = 'acknowledged',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

export enum AnalyticsAlertCode {
  BudgetExceeded = 'budget_exceeded',
  CashShortfallExpected = 'cash_shortfall_expected',
  CollectionDelay = 'collection_delay',
  NegativeProjectMargin = 'negative_project_margin_forecast',
  CriticalMaterialShortage = 'critical_material_shortage',
  PoDeliveryOverdue = 'po_delivery_overdue',
  DprNotSubmitted = 'dpr_not_submitted',
  ContractorBillPending = 'contractor_bill_pending',
  GstTdsDue = 'gst_tds_due',
  ComplianceDocumentExpiring = 'compliance_document_expiring',
  ProjectMilestoneDelayed = 'project_milestone_delayed',
  BookingCancellationSpike = 'unit_booking_cancellation_spike',
  ApprovalBottleneck = 'approval_bottleneck',
}

@Schema({
  collection: 'analytics_alerts',
  timestamps: true,
})
export class AnalyticsAlert {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: false, index: true })
  projectId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(AnalyticsAlertCode),
    required: true,
    index: true,
  })
  code!: AnalyticsAlertCode;

  @Prop({
    type: String,
    enum: Object.values(AnalyticsAlertSeverity),
    required: true,
    index: true,
  })
  severity!: AnalyticsAlertSeverity;

  @Prop({
    type: String,
    enum: Object.values(AnalyticsAlertStatus),
    default: AnalyticsAlertStatus.Open,
    index: true,
  })
  status!: AnalyticsAlertStatus;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  context?: Record<string, unknown>;

  /** Traceable source path for drill-down. */
  @Prop({ type: [String], default: [] })
  drillPath!: string[];

  @Prop({ type: String, required: false })
  sourceHref?: string;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  acknowledgedByUserId?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  acknowledgedAt?: Date;

  @Prop({ type: Date, required: true, index: true })
  detectedAt!: Date;
}

export const AnalyticsAlertSchema =
  SchemaFactory.createForClass(AnalyticsAlert);

AnalyticsAlertSchema.index({
  companyId: 1,
  status: 1,
  severity: 1,
  detectedAt: -1,
});
