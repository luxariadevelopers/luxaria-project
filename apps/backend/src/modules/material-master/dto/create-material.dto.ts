import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AbcClassification,
  MaterialStatus,
  MaterialType,
  MaterialUnit,
} from '../schemas/material.schema';

export class UnitConversionFactorDto {
  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty({
    example: 1000,
    description: '1 alternate unit = factorToBase × baseUnit',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  factorToBase!: number;
}

export class CreateMaterialDto {
  @ApiProperty({ example: 'OPC Cement 53 Grade' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'cement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  category!: string;

  @ApiPropertyOptional({ example: '53 Grade, 50kg bag' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specification?: string | null;

  @ApiPropertyOptional({ example: 'UltraTech' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @ApiProperty({ enum: MaterialUnit, example: MaterialUnit.Bag })
  @IsEnum(MaterialUnit)
  baseUnit!: MaterialUnit;

  @ApiPropertyOptional({
    enum: MaterialUnit,
    isArray: true,
    example: [MaterialUnit.Ton, MaterialUnit.Kilogram],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(MaterialUnit, { each: true })
  alternateUnits?: MaterialUnit[];

  @ApiPropertyOptional({ type: [UnitConversionFactorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitConversionFactorDto)
  conversionFactors?: UnitConversionFactorDto[];

  @ApiPropertyOptional({ example: 380 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  standardRate?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  standardWastagePercentage?: number;

  @ApiProperty({ description: 'Chart of accounts ledger for material postings' })
  @IsMongoId()
  ledgerAccountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialCategoryId?: string | null;

  @ApiPropertyOptional({ example: 'structural' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  materialGroup?: string | null;

  @ApiPropertyOptional({ example: '25232930' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  hsnCode?: string | null;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  preferredVendorIds?: string[];

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shelfLifeDays?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  batchControlled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  serialControlled?: boolean;

  @ApiPropertyOptional({ enum: MaterialType })
  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;

  @ApiPropertyOptional({ enum: AbcClassification })
  @IsOptional()
  @IsEnum(AbcClassification)
  abcClassification?: AbcClassification | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @ApiPropertyOptional({ enum: MaterialStatus })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;
}
