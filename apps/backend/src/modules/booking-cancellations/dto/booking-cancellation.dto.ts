import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BookingCancellationStatus } from '../schemas/booking-cancellation.schema';

export class RequestBookingCancellationDto {
  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty({ example: 'Customer relocation' })
  @IsString()
  @IsNotEmpty()
  cancellationReason!: string;

  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  cancellationDate?: string;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cancellationCharge?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class ReviewBookingCancellationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cancellationCharge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class ApproveBookingCancellationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class RejectBookingCancellationDto {
  @ApiProperty({ example: 'Cancellation not permitted under policy' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ProcessRefundDto {
  @ApiProperty({ description: 'Company bank account paying the refund' })
  @IsMongoId()
  refundBankAccountId!: string;

  @ApiProperty({ example: 'NEFT-REF-001' })
  @IsString()
  @IsNotEmpty()
  refundTransactionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  refundDate?: string;
}

export class AddCancellationDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'uploads/private/booking-cancellations/x/doc.pdf' })
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @ApiPropertyOptional({ example: 'cancellation_letter' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class ListBookingCancellationsQueryDto {
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

  @ApiPropertyOptional({ enum: BookingCancellationStatus })
  @IsOptional()
  @IsEnum(BookingCancellationStatus)
  status?: BookingCancellationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
