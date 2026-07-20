import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
import { PurchaseOrderStatus } from '../schemas/purchase-order.schema';

export class PurchaseOrderAddressDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '600001' })
  @IsString()
  @MaxLength(20)
  pincode!: string;

  @ApiPropertyOptional({ default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class PurchaseOrderItemInputDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty({ example: 380 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional({ example: 684 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  purchaseRequestId!: string;

  @ApiProperty()
  @IsMongoId()
  selectedQuotationId!: string;

  @ApiPropertyOptional({
    description: 'Defaults from selected quotation vendor when omitted',
  })
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  orderDate!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  expectedDeliveryDate!: string;

  @ApiProperty({ type: PurchaseOrderAddressDto })
  @ValidateNested()
  @Type(() => PurchaseOrderAddressDto)
  billingAddress!: PurchaseOrderAddressDto;

  @ApiProperty({ type: PurchaseOrderAddressDto })
  @ValidateNested()
  @Type(() => PurchaseOrderAddressDto)
  deliveryAddress!: PurchaseOrderAddressDto;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string | null;

  @ApiPropertyOptional({
    type: [PurchaseOrderItemInputDto],
    description: 'Defaults from selected quotation items when omitted',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items?: PurchaseOrderItemInputDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms?: string | null;
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class ListPurchaseOrdersQueryDto extends PaginationQueryDto {
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
  purchaseRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
}

export class RevisePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class ReceivePurchaseOrderItemDto {
  @ApiProperty({ description: 'PO line _id' })
  @IsMongoId()
  lineId!: string;

  @ApiProperty({
    example: 40,
    description: 'Quantity received in this receipt event',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  receivedQuantity!: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ApprovePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null;
}

export class RejectPurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
