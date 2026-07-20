import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { StockTransactionType } from '../../material-master/schemas/material-stock-transaction.schema';

export class PostStockLedgerEntryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ enum: StockTransactionType })
  @IsEnum(StockTransactionType)
  transactionType!: StockTransactionType;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityIn?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityOut?: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiPropertyOptional({ example: 'goods_receipt' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string | null;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({ example: 'Main Store' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @ApiPropertyOptional({ example: 'BATCH-A1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  batch?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      'Allow this post to drive balance negative (overrides global STOCK_ALLOW_NEGATIVE)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowNegative?: boolean;
}

export class ReverseStockLedgerEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

export class ListStockLedgerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional({ enum: StockTransactionType })
  @IsOptional()
  @IsEnum(StockTransactionType)
  transactionType?: StockTransactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class GetStockBalanceQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
