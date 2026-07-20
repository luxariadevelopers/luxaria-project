import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  StockReorderAlertStatus,
  StockReorderAlertType,
} from '../schemas/stock-reorder-alert.schema';

export class ForecastQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Lookback days for average daily consumption (default from env)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  lookbackDays?: number;
}

export class ListStockReorderAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional({ enum: StockReorderAlertType })
  @IsOptional()
  @IsEnum(StockReorderAlertType)
  alertType?: StockReorderAlertType;

  @ApiPropertyOptional({ enum: StockReorderAlertStatus })
  @IsOptional()
  @IsEnum(StockReorderAlertStatus)
  status?: StockReorderAlertStatus;
}

export class EvaluateStockReorderDto {
  @ApiPropertyOptional({
    description: 'Limit evaluation to one project; omit to scan all active projects',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  lookbackDays?: number;

  @ApiPropertyOptional({
    description: 'Evaluation as-of date (ISO). Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
