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
import { StockCountStatus } from '../schemas/stock-count.schema';

export class StockCountItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 95 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  physicalQuantity!: number;

  @ApiPropertyOptional({
    description: 'Required when physical ≠ system quantity',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;

  @ApiPropertyOptional({ description: 'Evidence photo document id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  photo?: string | null;
}

export class CreateStockCountDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  countDate!: string;

  @ApiPropertyOptional({ description: 'Defaults to the authenticated user' })
  @IsOptional()
  @IsMongoId()
  countedBy?: string;

  @ApiPropertyOptional({ example: 'Main Store' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({ type: [StockCountItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockCountItemDto)
  items!: StockCountItemDto[];
}

export class UpdateStockCountDto {
  @ApiPropertyOptional({ example: '2026-07-17' })
  @IsOptional()
  @IsDateString()
  countDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [StockCountItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockCountItemDto)
  items?: StockCountItemDto[];
}

export class ListStockCountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: StockCountStatus })
  @IsOptional()
  @IsEnum(StockCountStatus)
  status?: StockCountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ApproveStockCountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null;
}
