import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MaterialConsumptionReportStatus } from '../schemas/material-consumption-report.schema';

export class GenerateMaterialConsumptionReportDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional({
    description: 'Inclusive period start (YYYY-MM-DD). Omit for all history.',
  })
  @IsOptional()
  @IsDateString()
  periodFrom?: string | null;

  @ApiPropertyOptional({
    description: 'Inclusive period end (YYYY-MM-DD). Omit for all history.',
  })
  @IsOptional()
  @IsDateString()
  periodTo?: string | null;

  @ApiPropertyOptional({
    description: 'Report as-of date (defaults to today / periodTo)',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class MaterialConsumptionLineExplanationDto {
  @ApiProperty()
  @IsMongoId()
  lineId!: string;

  @ApiProperty({
    description: 'Required when the line has a material variance',
  })
  @IsString()
  @MaxLength(2000)
  explanation!: string;
}

export class UpdateMaterialConsumptionReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [MaterialConsumptionLineExplanationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaterialConsumptionLineExplanationDto)
  explanations?: MaterialConsumptionLineExplanationDto[];
}

export class ApproveMaterialConsumptionReportDto {
  @ApiPropertyOptional({
    description: 'Required when the report has variance lines needing approval',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  approvalComment?: string;
}

export class ListMaterialConsumptionReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: MaterialConsumptionReportStatus })
  @IsOptional()
  @IsEnum(MaterialConsumptionReportStatus)
  status?: MaterialConsumptionReportStatus;

  @ApiPropertyOptional({
    description: 'When true, only reports that require variance approval',
  })
  @IsOptional()
  requiresApproval?: boolean;
}

export class PreviewMaterialConsumptionQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
