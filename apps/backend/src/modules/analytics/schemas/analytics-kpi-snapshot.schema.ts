import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type AnalyticsKpiSnapshotDocument =
  HydratedDocument<AnalyticsKpiSnapshot>;

export enum AnalyticsSnapshotKind {
  DailyProjectKpi = 'daily_project_kpi',
  WeeklyDirectorSummary = 'weekly_director_summary',
  MonthlyFinancialClose = 'monthly_financial_close',
  BudgetVersion = 'budget_version',
  ForecastVersion = 'forecast_version',
  CashFlowForecast = 'cash_flow_forecast',
  ProjectProgress = 'project_progress',
}

/**
 * Immutable analytics read-model snapshot.
 * Once created, payload must not be mutated (enforced in service).
 */
@Schema({
  collection: 'analytics_kpi_snapshots',
  timestamps: { createdAt: true, updatedAt: false },
})
export class AnalyticsKpiSnapshot {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(AnalyticsSnapshotKind),
    required: true,
    index: true,
  })
  kind!: AnalyticsSnapshotKind;

  @Prop({ type: SchemaTypes.ObjectId, required: false, index: true })
  projectId?: Types.ObjectId;

  /** Business date the snapshot represents (UTC midnight). */
  @Prop({ type: Date, required: true, index: true })
  asOfDate!: Date;

  @Prop({ type: String, required: true })
  versionLabel!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  createdByUserId!: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  immutable!: boolean;

  createdAt?: Date;
}

export const AnalyticsKpiSnapshotSchema = SchemaFactory.createForClass(
  AnalyticsKpiSnapshot,
);

AnalyticsKpiSnapshotSchema.index(
  { companyId: 1, kind: 1, asOfDate: 1, projectId: 1, versionLabel: 1 },
  { unique: true },
);
AnalyticsKpiSnapshotSchema.index({ companyId: 1, kind: 1, createdAt: -1 });
