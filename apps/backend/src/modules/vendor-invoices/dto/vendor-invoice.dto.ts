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
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '../schemas/vendor-invoice.schema';

export class VendorInvoiceItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  purchaseOrderLineId?: string | null;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiProperty({ example: 400 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class CreateVendorInvoiceDto {
  @ApiProperty({ description: 'Vendor’s invoice number' })
  @IsString()
  @MaxLength(80)
  invoiceNumber!: string;

  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  purchaseOrderId!: string;

  @ApiProperty({ type: [String], description: 'Linked GRN ids' })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  grnIds!: string[];

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 4000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxableValue!: number;

  @ApiProperty({ example: 720 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gst!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retention?: number;

  @ApiPropertyOptional({ example: 0 })
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

  @ApiProperty({ example: 4720 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiPropertyOptional({ description: 'Invoice scan document id / path' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invoiceDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({ type: [VendorInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorInvoiceItemDto)
  items!: VendorInvoiceItemDto[];
}

export class UpdateVendorInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  invoiceNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  grnIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxableValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gst?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retention?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invoiceDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [VendorInvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorInvoiceItemDto)
  items?: VendorInvoiceItemDto[];
}

export class ListVendorInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ enum: VendorInvoiceStatus })
  @IsOptional()
  @IsEnum(VendorInvoiceStatus)
  status?: VendorInvoiceStatus;

  @ApiPropertyOptional({ enum: VendorInvoiceMatchingStatus })
  @IsOptional()
  @IsEnum(VendorInvoiceMatchingStatus)
  matchingStatus?: VendorInvoiceMatchingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ApproveVendorInvoiceDto {
  @ApiPropertyOptional({
    description: 'Required when matching status is exception',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  exceptionApprovalComment?: string | null;
}

export class RejectMatchingDto {
  @ApiProperty({ description: 'Reason for rejecting the three-way match' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
