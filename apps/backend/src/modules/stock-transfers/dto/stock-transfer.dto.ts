import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import {
  StockTransferScope,
  StockTransferStatus,
} from '../schemas/stock-transfer.schema';

export class StockTransferItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  batch?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CreateStockTransferDto {
  @ApiProperty({ enum: StockTransferScope })
  @IsEnum(StockTransferScope)
  scope!: StockTransferScope;

  @ApiProperty()
  @IsMongoId()
  sourceProjectId!: string;

  @ApiProperty()
  @IsMongoId()
  destProjectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  sourceWarehouseId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  destWarehouseId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  sourceSiteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  destSiteId?: string | null;

  @ApiPropertyOptional({ description: 'Balance location key (source)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceLocation?: string;

  @ApiPropertyOptional({ description: 'Balance location key (destination)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destLocation?: string;

  @ApiProperty()
  @IsDateString()
  transferDate!: string;

  @ApiProperty({ type: [StockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items!: StockTransferItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ListStockTransfersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: StockTransferStatus })
  @IsOptional()
  @IsEnum(StockTransferStatus)
  status?: StockTransferStatus;
}
