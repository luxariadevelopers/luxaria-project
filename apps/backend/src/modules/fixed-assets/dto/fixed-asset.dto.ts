import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  DepreciationMethod,
  FixedAssetCategory,
  FixedAssetStatus,
} from '../schemas/fixed-asset.schema';
import { FixedAssetDepreciationStatus } from '../schemas/fixed-asset-depreciation.schema';

export class CreateFixedAssetDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiProperty({ enum: FixedAssetCategory })
  @IsEnum(FixedAssetCategory)
  category!: FixedAssetCategory;

  @ApiProperty()
  @IsDateString()
  capitalizationDate!: string;

  @ApiProperty()
  @IsDateString()
  putToUseDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  grossBlock!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usefulLifeMonths!: number;

  @ApiPropertyOptional({ enum: DepreciationMethod })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  depreciationRatePercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  purchaseReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  glAssetAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  glAccumDepAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  glDepExpenseAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateFixedAssetDto extends PartialType(
  OmitType(CreateFixedAssetDto, ['companyId'] as const),
) {}

export class DisposeFixedAssetDto {
  @ApiProperty()
  @IsDateString()
  disposalDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  disposalAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class DepreciateFixedAssetDto {
  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({ minimum: 1900 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  periodYear!: number;

  @ApiPropertyOptional({
    description: 'Override computed SLM/WDV amount for the period',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class ListFixedAssetsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: FixedAssetStatus })
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus;

  @ApiPropertyOptional({ enum: FixedAssetCategory })
  @IsOptional()
  @IsEnum(FixedAssetCategory)
  category?: FixedAssetCategory;
}

export class ListFixedAssetDepreciationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ enum: FixedAssetDepreciationStatus })
  @IsOptional()
  @IsEnum(FixedAssetDepreciationStatus)
  status?: FixedAssetDepreciationStatus;
}
