import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import type { ConstructionExportFormat } from '../construction-reports.constants';
import { ConstructionReportType } from '../construction-reports.constants';

export class ConstructionReportsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;
}

export class ConstructionReportExportQueryDto extends ConstructionReportsQueryDto {
  @ApiProperty({ enum: ['pdf', 'xlsx'], default: 'xlsx' })
  @IsEnum(['pdf', 'xlsx'] as const)
  format!: ConstructionExportFormat;
}

export class ConstructionReportTypeParamDto {
  @ApiProperty({ enum: ConstructionReportType })
  @IsEnum(ConstructionReportType)
  reportType!: ConstructionReportType;
}
