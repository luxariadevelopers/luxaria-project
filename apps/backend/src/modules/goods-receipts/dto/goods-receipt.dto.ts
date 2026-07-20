import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
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
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import { GoodsReceiptStatus } from '../schemas/goods-receipt.schema';

export class GoodsReceiptItemInputDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional({
    description: 'PO line _id when receiving against a purchase order line',
  })
  @IsOptional()
  @IsMongoId()
  purchaseOrderLineId?: string | null;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderedQuantity!: number;

  @ApiProperty({ example: 95 })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  receivedQuantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;
}

export class CreateGoodsReceiptDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  purchaseOrderId!: string;

  @ApiPropertyOptional({
    description: 'Defaults from purchase order vendor when omitted',
  })
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryChallanNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleNumber?: string | null;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  receivedDate!: string;

  @ApiProperty({ type: [GoodsReceiptItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemInputDto)
  items!: GoodsReceiptItemInputDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Receipt photo document IDs or paths. Can also arrive via attachments.photo_* from offline sync.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  challanDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  weighbridgeDocument?: string | null;

  @ApiProperty({ example: 13.0827 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 80.2707 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({
    description:
      'When true, create as Submitted (used by mobile offline submission)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @ApiPropertyOptional({
    description: 'Merged by offline sync engine (photo_*, challanDocument, …)',
  })
  @IsOptional()
  attachments?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTransactionId?: string | null;
}

export class UpdateGoodsReceiptDto extends PartialType(CreateGoodsReceiptDto) {}

export class ListGoodsReceiptsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional({ enum: GoodsReceiptStatus })
  @IsOptional()
  @IsEnum(GoodsReceiptStatus)
  status?: GoodsReceiptStatus;
}

export class QualityAcceptItemDto {
  @ApiProperty({ description: 'GRN line _id' })
  @IsMongoId()
  lineId!: string;

  @ApiProperty({ example: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  acceptedQuantity!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rejectedQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason?: string | null;
}

export class QualityAcceptGoodsReceiptDto {
  @ApiProperty({ type: [QualityAcceptItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QualityAcceptItemDto)
  items!: QualityAcceptItemDto[];
}
