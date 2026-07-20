import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from '../schemas/customer-receipt.schema';

export class ScheduleAllocationDto {
  @ApiProperty({ description: 'Payment demand id to allocate against' })
  @IsMongoId()
  demandId!: string;

  @ApiProperty({ example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateCustomerReceiptDto {
  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: CustomerReceiptPaymentMode })
  @IsEnum(CustomerReceiptPaymentMode)
  paymentMode!: CustomerReceiptPaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyBankAccountId?: string | null;

  @ApiPropertyOptional({ example: 'UTR123456789' })
  @IsOptional()
  @IsString()
  transactionReference?: string | null;

  @ApiProperty({ enum: CustomerReceiptSourceType })
  @IsEnum(CustomerReceiptSourceType)
  sourceType!: CustomerReceiptSourceType;

  @ApiPropertyOptional({
    description: 'Required when sourceType is bank_loan',
    example: 'HDFC Bank',
  })
  @IsOptional()
  @IsString()
  loanBank?: string | null;

  @ApiPropertyOptional({
    type: [ScheduleAllocationDto],
    description:
      'Allocate across payment demands; remainder becomes unallocated advance',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAllocationDto)
  scheduleAllocation?: ScheduleAllocationDto[];

  @ApiPropertyOptional({
    description: 'Relative path to uploaded supporting document',
  })
  @IsOptional()
  @IsString()
  receiptDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({
    description: 'Post immediately after create',
    default: false,
  })
  @IsOptional()
  post?: boolean;
}

export class UpdateCustomerReceiptDto extends PartialType(
  CreateCustomerReceiptDto,
) {}

export class CancelCustomerReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string | null;
}

export class ListCustomerReceiptsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CustomerReceiptStatus })
  @IsOptional()
  @IsEnum(CustomerReceiptStatus)
  status?: CustomerReceiptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: CustomerReceiptSourceType })
  @IsOptional()
  @IsEnum(CustomerReceiptSourceType)
  sourceType?: CustomerReceiptSourceType;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
