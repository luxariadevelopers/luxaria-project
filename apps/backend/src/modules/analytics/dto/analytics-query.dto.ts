import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AnalyticsSnapshotKind } from '../schemas/analytics-kpi-snapshot.schema';
import {
  AnalyticsAlertCode,
  AnalyticsAlertSeverity,
  AnalyticsAlertStatus,
} from '../schemas/analytics-alert.schema';

export class AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ description: 'As-of date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Range start (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Range end (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CashFlowForecastQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: [7, 30, 90, 'monthly', 'completion'],
    description: 'Forecast horizon',
  })
  @IsOptional()
  @IsIn(['7', '30', '90', 'monthly', 'completion', 7, 30, 90])
  horizon?: string | number;
}

export class CreateSnapshotDto {
  @ApiPropertyOptional({ enum: AnalyticsSnapshotKind })
  @IsEnum(AnalyticsSnapshotKind)
  kind!: AnalyticsSnapshotKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  asOfDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  versionLabel?: string;
}

export class ListSnapshotsQueryDto {
  @ApiPropertyOptional({ enum: AnalyticsSnapshotKind })
  @IsOptional()
  @IsEnum(AnalyticsSnapshotKind)
  kind?: AnalyticsSnapshotKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListAlertsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: AnalyticsAlertStatus })
  @IsOptional()
  @IsEnum(AnalyticsAlertStatus)
  status?: AnalyticsAlertStatus;

  @ApiPropertyOptional({ enum: AnalyticsAlertSeverity })
  @IsOptional()
  @IsEnum(AnalyticsAlertSeverity)
  severity?: AnalyticsAlertSeverity;

  @ApiPropertyOptional({ enum: AnalyticsAlertCode })
  @IsOptional()
  @IsEnum(AnalyticsAlertCode)
  code?: AnalyticsAlertCode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class DrillDownQueryDto {
  @ApiPropertyOptional({
    description:
      'KPI key e.g. receivables, payables, cash, collections, contractor_exposure',
  })
  @IsString()
  @MaxLength(80)
  kpi!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;
}

export class AnalyticsExportQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'director_daily_brief',
      'weekly_project_review',
      'monthly_management_accounts',
      'project_profitability',
      'budget_variance',
      'cash_flow_forecast',
      'sales_collection',
      'construction_progress',
      'procurement_exposure',
      'inventory_exposure',
      'contractor_exposure',
      'risk_register',
    ],
  })
  @IsString()
  report!: string;

  @ApiPropertyOptional({ enum: ['pdf', 'excel', 'csv'] })
  @IsOptional()
  @IsIn(['pdf', 'excel', 'csv'])
  format?: 'pdf' | 'excel' | 'csv';
}
