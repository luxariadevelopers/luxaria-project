import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  UnitFacing,
  UnitStatus,
  UnitType,
} from '../schemas/unit.schema';

export class CreateUnitDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @MaxLength(40)
  block!: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @MaxLength(40)
  floor!: string;

  @ApiProperty({ example: '1201' })
  @IsString()
  @MaxLength(40)
  unitNumber!: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unitType!: UnitType;

  @ApiProperty({ example: 850 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carpetArea!: number;

  @ApiProperty({ example: 1050 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  builtUpArea!: number;

  @ApiProperty({ example: 320, description: 'Undivided share' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  uds!: number;

  @ApiPropertyOptional({ enum: UnitFacing })
  @IsOptional()
  @IsEnum(UnitFacing)
  facing?: UnitFacing | null;

  @ApiPropertyOptional({ example: '1 covered' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  parking?: string | null;

  @ApiProperty({ example: 7500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCharges?: number;

  @ApiPropertyOptional({ example: 375000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ enum: UnitStatus, default: UnitStatus.Available })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  block?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitNumber?: string;

  @ApiPropertyOptional({ enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carpetArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  builtUpArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  uds?: number;

  @ApiPropertyOptional({ enum: UnitFacing })
  @IsOptional()
  @IsEnum(UnitFacing)
  facing?: UnitFacing | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  parking?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ChangeUnitStatusDto {
  @ApiProperty({ enum: UnitStatus })
  @IsEnum(UnitStatus)
  status!: UnitStatus;

  @ApiPropertyOptional({
    description: 'Optional booking / customer reference ObjectId',
  })
  @IsOptional()
  @IsMongoId()
  bookingRefId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListUnitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  block?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional({ enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
