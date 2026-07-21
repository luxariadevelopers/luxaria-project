import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
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
import { CustomerInvoiceStatus } from '../schemas/customer-invoice.schema';

export class CustomerInvoiceLineDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxableAmount!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;
}

export class CreateCustomerInvoiceDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string | null;

  @ApiProperty()
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cgst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sgst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  igst?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeOfSupply?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  hsnSac?: string | null;

  @ApiProperty({ type: [CustomerInvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomerInvoiceLineDto)
  lines!: CustomerInvoiceLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  demandId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  paymentScheduleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateCustomerInvoiceDto extends PartialType(
  OmitType(CreateCustomerInvoiceDto, ['companyId'] as const),
) {}

export class CancelCustomerInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class ListCustomerInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ enum: CustomerInvoiceStatus })
  @IsOptional()
  @IsEnum(CustomerInvoiceStatus)
  status?: CustomerInvoiceStatus;
}
