import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class FinanceDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'As-of reporting date (ISO). Defaults to today (UTC).',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter to a single project' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Inclusive range start (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive range end (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Financial year id — constrains transactional date ranges',
  })
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional({
    description: 'Upcoming payments / forecast horizon in days (default 30)',
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  horizonDays?: number;
}

export class FinanceDashboardExportQueryDto extends FinanceDashboardQueryDto {
  @ApiPropertyOptional({
    enum: ['csv', 'xlsx'],
    default: 'xlsx',
    description: 'Export format',
  })
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx';
}
