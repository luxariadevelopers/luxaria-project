import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsDateString } from 'class-validator';
import type { AccountingExportFormat } from '../accounting-reports.constants';
import { AccountingReportType } from '../accounting-reports.constants';

export class AccountingReportsQueryDto {
  @ApiPropertyOptional({ description: 'Financial year ObjectId' })
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional({ description: 'Project ObjectId' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Period start (ISO date)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Period end (ISO date)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Account filter (general ledger / cash / bank book)',
  })
  @IsOptional()
  @IsMongoId()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Party filter for party ledgers',
  })
  @IsOptional()
  @IsMongoId()
  partyId?: string;
}

export class AccountingReportExportQueryDto extends AccountingReportsQueryDto {
  @ApiProperty({ enum: ['pdf', 'xlsx'], default: 'xlsx' })
  @IsEnum(['pdf', 'xlsx'] as const)
  format!: AccountingExportFormat;
}

export class AccountingReportTypeParamDto {
  @ApiProperty({ enum: AccountingReportType })
  @IsEnum(AccountingReportType)
  reportType!: AccountingReportType;
}
