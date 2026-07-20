import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { QuotationComparisonStatus } from '../schemas/quotation-comparison.schema';

export class VendorHistoryOverrideDto {
  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Previous quality score 0–5',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  previousQuality?: number | null;

  @ApiPropertyOptional({
    example: 3.5,
    description: 'Previous delivery performance score 0–5',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  previousDeliveryPerformance?: number | null;
}

export class GenerateQuotationComparisonDto {
  @ApiProperty()
  @IsMongoId()
  purchaseRequestId!: string;

  @ApiPropertyOptional({
    type: [VendorHistoryOverrideDto],
    description:
      'Optional historical quality/delivery scores per vendor (until GRN history exists)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorHistoryOverrideDto)
  vendorHistory?: VendorHistoryOverrideDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class RecommendQuotationComparisonDto {
  @ApiProperty({ description: 'Vendor quotation id to recommend' })
  @IsMongoId()
  quotationId!: string;

  @ApiPropertyOptional({
    description:
      'Required when the recommended vendor is not the lowest net landed cost',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason?: string | null;
}

export class ListQuotationComparisonsQueryDto extends PaginationQueryDto {
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
  projectId?: string;

  @ApiPropertyOptional({ enum: QuotationComparisonStatus })
  @IsOptional()
  @IsEnum(QuotationComparisonStatus)
  status?: QuotationComparisonStatus;
}
