import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export class VendorPortalQuotationItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateVendorPortalQuotationDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ type: [VendorPortalQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorPortalQuotationItemDto)
  items!: VendorPortalQuotationItemDto[];
}
