import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import { VendorQuotationStatus } from '../schemas/vendor-quotation.schema';

export class VendorQuotationItemInputDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty({ example: 380 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional({ example: 684, description: 'Line tax amount (₹)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Line discount amount (₹)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateVendorQuotationDto {
  @ApiProperty()
  @IsMongoId()
  purchaseRequestId!: string;

  @ApiPropertyOptional({
    description: 'Optional RFQ; vendor must be invited when set',
  })
  @IsOptional()
  @IsMongoId()
  rfqId?: string | null;

  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  quotationDate!: string;

  @ApiProperty({ example: '2026-08-17' })
  @IsDateString()
  validityDate!: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryDays?: number;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string | null;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Header tax amount (₹)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Header discount amount (₹)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ type: [VendorQuotationItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorQuotationItemInputDto)
  items!: VendorQuotationItemInputDto[];
}

export class UpdateVendorQuotationDto extends PartialType(
  CreateVendorQuotationDto,
) {}

export class ListVendorQuotationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  purchaseRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: VendorQuotationStatus })
  @IsOptional()
  @IsEnum(VendorQuotationStatus)
  status?: VendorQuotationStatus;
}

export class CompareVendorQuotationsQueryDto {
  @ApiProperty({ description: 'Purchase request to compare quotations for' })
  @IsMongoId()
  purchaseRequestId!: string;
}

export class ReviseVendorQuotationDto extends PartialType(
  CreateVendorQuotationDto,
) {}
