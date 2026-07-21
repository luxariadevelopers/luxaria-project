import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import {
  StockReservationSourceType,
  StockReservationStatus,
} from '../schemas/stock-reservation.schema';

export class CreateStockReservationDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ enum: StockReservationSourceType })
  @IsEnum(StockReservationSourceType)
  sourceType!: StockReservationSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ReleaseStockReservationDto {
  @ApiPropertyOptional({
    description: 'Partial release quantity in reservation unit (default: all)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity?: number;
}

export class ListStockReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional({ enum: StockReservationStatus })
  @IsOptional()
  @IsEnum(StockReservationStatus)
  status?: StockReservationStatus;

  @ApiPropertyOptional({ enum: StockReservationSourceType })
  @IsOptional()
  @IsEnum(StockReservationSourceType)
  sourceType?: StockReservationSourceType;
}
