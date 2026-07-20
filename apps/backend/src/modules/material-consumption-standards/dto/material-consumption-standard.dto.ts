import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BoqUnit } from '../../boq/schemas/boq.schema';
import { MaterialConsumptionStandardStatus } from '../schemas/material-consumption-standard.schema';

export class CreateMaterialConsumptionStandardDto {
  @ApiPropertyOptional({
    description: 'Omit for company-wide standard; set for project override',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({
    description: 'BOQ item this coefficient applies to',
  })
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional({
    example: 'Brick masonry',
    description: 'Work type when not tied to a BOQ item (boqItemId OR workType required)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workType?: string | null;

  @ApiProperty({ enum: BoqUnit, example: BoqUnit.SquareFoot })
  @IsEnum(BoqUnit)
  outputUnit!: BoqUnit;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 8, description: 'Standard consumption per 1 output unit' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityPerUnit!: number;

  @ApiProperty({ example: 5, description: 'Allowed wastage %' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  wastagePercentage!: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'When creating a project override, link to global standard id',
  })
  @IsOptional()
  @IsMongoId()
  overridesStandardId?: string | null;
}

export class UpdateMaterialConsumptionStandardDto extends PartialType(
  CreateMaterialConsumptionStandardDto,
) {}

export class ListMaterialConsumptionStandardsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'When true, only company-wide (projectId null) standards',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  globalOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional({ enum: BoqUnit })
  @IsOptional()
  @IsEnum(BoqUnit)
  outputUnit?: BoqUnit;

  @ApiPropertyOptional({ enum: MaterialConsumptionStandardStatus })
  @IsOptional()
  @IsEnum(MaterialConsumptionStandardStatus)
  status?: MaterialConsumptionStandardStatus;
}

export class ResolveMaterialConsumptionStandardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  outputUnit!: BoqUnit;

  @ApiPropertyOptional({ description: 'As-of date for effectiveDate filter' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class ApproveMaterialConsumptionStandardDto {
  @ApiProperty({ example: 'APR-MCS-001' })
  @IsString()
  @MaxLength(120)
  approvalReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class RejectMaterialConsumptionStandardDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
