import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProcurementMasterStatus } from '../schemas/procurement-master-status';

export class CreateCatalogItemDto {
  @ApiProperty({ example: 'NET30' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must be alphanumeric (underscore/hyphen allowed)',
  })
  code!: string;

  @ApiProperty({ example: 'Net 30 days' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class UpdateCatalogItemDto extends PartialType(CreateCatalogItemDto) {}

export class CreatePaymentTermDto extends CreateCatalogItemDto {
  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  days!: number;
}

export class UpdatePaymentTermDto extends PartialType(CreatePaymentTermDto) {}

export class CreateDeliveryTermDto extends CreateCatalogItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateDeliveryTermDto extends PartialType(CreateDeliveryTermDto) {}

export class CreateTaxRuleDto extends CreateCatalogItemDto {
  @ApiProperty({ example: 18 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent!: number;
}

export class UpdateTaxRuleDto extends PartialType(CreateTaxRuleDto) {}

export class CreatePreferredVendorDto {
  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  materialId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  materialCategoryCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdatePreferredVendorDto extends PartialType(
  CreatePreferredVendorDto,
) {}

export class CreateVendorPriceListDto {
  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 380 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  taxRuleId?: string | null;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateVendorPriceListDto extends PartialType(
  CreateVendorPriceListDto,
) {}

export class ListProcurementMastersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProcurementMasterStatus })
  @IsOptional()
  @IsEnum(ProcurementMasterStatus)
  status?: ProcurementMasterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
