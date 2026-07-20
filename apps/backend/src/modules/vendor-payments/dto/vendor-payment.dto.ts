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
import {
  VendorPaymentMode,
  VendorPaymentStatus,
} from '../schemas/vendor-payment.schema';

export class VendorPaymentAllocationDto {
  @ApiProperty()
  @IsMongoId()
  invoiceId!: string;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateVendorPaymentDto {
  @ApiProperty()
  @IsMongoId()
  vendorId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ type: [VendorPaymentAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorPaymentAllocationDto)
  allocations!: VendorPaymentAllocationDto[];

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({
    example: 1000,
    description: 'Gross AP reduction (must equal sum of allocations)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: VendorPaymentMode })
  @IsEnum(VendorPaymentMode)
  paymentMode!: VendorPaymentMode;

  @ApiProperty()
  @IsMongoId()
  bankAccountId!: string;

  @ApiProperty({ description: 'Bank UTR / cheque / transaction ID' })
  @IsString()
  @MaxLength(120)
  transactionReference!: string;

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
  deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentProof?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateVendorPaymentDto {
  @ApiPropertyOptional({ type: [VendorPaymentAllocationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorPaymentAllocationDto)
  allocations?: VendorPaymentAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: VendorPaymentMode })
  @IsOptional()
  @IsEnum(VendorPaymentMode)
  paymentMode?: VendorPaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionReference?: string;

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
  deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentProof?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListVendorPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional({ enum: VendorPaymentStatus })
  @IsOptional()
  @IsEnum(VendorPaymentStatus)
  status?: VendorPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
