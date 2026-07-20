import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
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
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from '../schemas/purchase-request.schema';

export class PurchaseRequestItemInputDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  requestedQuantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiPropertyOptional({ example: 380 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedRate?: number | null;

  @ApiPropertyOptional({ description: 'Optional BOQ line reference' })
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class CreatePurchaseRequestDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  requiredByDate!: string;

  @ApiPropertyOptional({
    enum: PurchaseRequestPriority,
    default: PurchaseRequestPriority.Normal,
  })
  @IsOptional()
  @IsEnum(PurchaseRequestPriority)
  priority?: PurchaseRequestPriority;

  @ApiProperty({ type: [PurchaseRequestItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemInputDto)
  items!: PurchaseRequestItemInputDto[];

  @ApiProperty({ example: 'Foundation pour scheduled next week' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justification!: string;
}

export class UpdatePurchaseRequestDto extends PartialType(
  CreatePurchaseRequestDto,
) {}

export class ListPurchaseRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: PurchaseRequestStatus })
  @IsOptional()
  @IsEnum(PurchaseRequestStatus)
  status?: PurchaseRequestStatus;

  @ApiPropertyOptional({ enum: PurchaseRequestPriority })
  @IsOptional()
  @IsEnum(PurchaseRequestPriority)
  priority?: PurchaseRequestPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  requestedBy?: string;
}

export class ReviewPurchaseRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ApprovePurchaseRequestItemDto {
  @ApiProperty({ description: 'Purchase request line _id' })
  @IsMongoId()
  lineId!: string;

  @ApiProperty({
    example: 80,
    description: 'Approved qty (0 = reject line; may be < requested for partial)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedQuantity!: number;
}

export class ApprovePurchaseRequestDto {
  @ApiProperty({ type: [ApprovePurchaseRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovePurchaseRequestItemDto)
  items!: ApprovePurchaseRequestItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class RejectPurchaseRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

export class ReturnPurchaseRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
