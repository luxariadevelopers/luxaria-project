import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  BoqHierarchyStatus,
  BoqItemStatus,
  BoqUnit,
} from '../schemas/boq.schema';

export class CreateBoqBlockDto {
  @ApiProperty({ example: 'BLK-A' })
  @IsString()
  @MaxLength(40)
  blockCode!: string;

  @ApiProperty({ example: 'Block A' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateBoqBlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: BoqHierarchyStatus })
  @IsOptional()
  @IsEnum(BoqHierarchyStatus)
  status?: BoqHierarchyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateBoqFloorDto {
  @ApiProperty({ example: 'FL-01' })
  @IsString()
  @MaxLength(40)
  floorCode!: string;

  @ApiProperty({ example: 'Ground Floor' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateBoqFloorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: BoqHierarchyStatus })
  @IsOptional()
  @IsEnum(BoqHierarchyStatus)
  status?: BoqHierarchyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateBoqWorkCategoryDto {
  @ApiProperty({ example: 'WC-CIVIL' })
  @IsString()
  @MaxLength(40)
  categoryCode!: string;

  @ApiProperty({ example: 'Civil Works' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateBoqWorkCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: BoqHierarchyStatus })
  @IsOptional()
  @IsEnum(BoqHierarchyStatus)
  status?: BoqHierarchyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class BoqMaterialCoefficientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string | null;

  @ApiPropertyOptional({ example: 'MAT-CEM' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  materialCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @ApiProperty({ example: 0.4 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coefficient!: number;

  @ApiPropertyOptional({ enum: BoqUnit })
  @IsOptional()
  @IsEnum(BoqUnit)
  unit?: BoqUnit | null;
}

export class CreateBoqItemDto {
  @ApiProperty({
    description: 'Target draft BOQ version (defaults to project draft / creates Original)',
  })
  @IsOptional()
  @IsMongoId()
  versionId?: string;

  @ApiProperty()
  @IsMongoId()
  workCategoryId!: string;

  @ApiPropertyOptional({
    description: 'Optional; auto-generated as BOQ-YYYY-###### when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  boqCode?: string;

  @ApiProperty({ example: 'RCC for columns M25' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedQuantity!: number;

  @ApiPropertyOptional({ example: 4500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  materialCost?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCost?: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subcontractCost?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @ApiPropertyOptional({
    description: 'Defaults to sum of cost components',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedRate?: number;

  @ApiPropertyOptional({
    description: 'Defaults to plannedQuantity × plannedRate',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ type: [BoqMaterialCoefficientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoqMaterialCoefficientDto)
  materialCoefficients?: BoqMaterialCoefficientDto[];

  @ApiPropertyOptional({ enum: BoqItemStatus })
  @IsOptional()
  @IsEnum(BoqItemStatus)
  status?: BoqItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateBoqItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: BoqUnit })
  @IsOptional()
  @IsEnum(BoqUnit)
  unit?: BoqUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  materialCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subcontractCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ type: [BoqMaterialCoefficientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoqMaterialCoefficientDto)
  materialCoefficients?: BoqMaterialCoefficientDto[];

  @ApiPropertyOptional({ enum: BoqItemStatus })
  @IsOptional()
  @IsEnum(BoqItemStatus)
  status?: BoqItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListBoqItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Defaults to the active version, else latest draft',
  })
  @IsOptional()
  @IsMongoId()
  versionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  blockId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  floorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workCategoryId?: string;

  @ApiPropertyOptional({ enum: BoqItemStatus })
  @IsOptional()
  @IsEnum(BoqItemStatus)
  status?: BoqItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
