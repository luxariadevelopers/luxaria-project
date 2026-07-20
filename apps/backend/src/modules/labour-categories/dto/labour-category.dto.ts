import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  LabourCategoryStatus,
  LabourCategoryRateStatus,
  LabourSkillLevel,
} from '../schemas/labour-category.schema';

export class CreateLabourCategoryDto {
  @ApiProperty({ example: 'Mason' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: LabourSkillLevel, example: LabourSkillLevel.Skilled })
  @IsEnum(LabourSkillLevel)
  skillLevel!: LabourSkillLevel;

  @ApiProperty({ example: 900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultDailyRate!: number;

  @ApiProperty({ example: 1350 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateLabourCategoryDto extends PartialType(
  CreateLabourCategoryDto,
) {}

export class ListLabourCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LabourCategoryStatus })
  @IsOptional()
  @IsEnum(LabourCategoryStatus)
  status?: LabourCategoryStatus;

  @ApiPropertyOptional({ enum: LabourSkillLevel })
  @IsOptional()
  @IsEnum(LabourSkillLevel)
  skillLevel?: LabourSkillLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateLabourCategoryRateDto {
  @ApiPropertyOptional({
    description: 'Project-scoped rate (omit for contractor-only)',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({
    description: 'Contractor-scoped rate (omit for project-only)',
  })
  @IsOptional()
  @IsMongoId()
  contractorId?: string | null;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate!: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeRate!: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateLabourCategoryRateDto extends PartialType(
  OmitType(CreateLabourCategoryRateDto, ['projectId', 'contractorId'] as const),
) {
  @ApiPropertyOptional({ enum: LabourCategoryRateStatus })
  @IsOptional()
  @IsEnum(LabourCategoryRateStatus)
  status?: LabourCategoryRateStatus;
}

export class ListLabourCategoryRatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ enum: LabourCategoryRateStatus })
  @IsOptional()
  @IsEnum(LabourCategoryRateStatus)
  status?: LabourCategoryRateStatus;
}

export class ResolveLabourCategoryRateQueryDto {
  @ApiProperty()
  @IsMongoId()
  labourCategoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ description: 'As-of date for effectiveDate filter' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
