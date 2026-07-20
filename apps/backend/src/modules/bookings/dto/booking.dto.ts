import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CustomerFundingType } from '../../customers/schemas/customer.schema';
import { BookingStatus } from '../schemas/booking.schema';

export class BookingPaymentInstallmentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  sequence!: number;

  @ApiProperty({ example: 'On booking' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percent?: number | null;
}

export class BookingPaymentPlanDto {
  @ApiPropertyOptional({ example: 'Construction-linked' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ type: [BookingPaymentInstallmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingPaymentInstallmentDto)
  installments?: BookingPaymentInstallmentDto[];
}

export class BookingBrokerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firmName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: BookingBrokerDto) => !!o.email)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number | null;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiPropertyOptional({
    description:
      'Optional joint-applicant reference id (customer must have a joint applicant)',
  })
  @IsOptional()
  @IsMongoId()
  jointApplicantId?: string | null;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  @ApiProperty({ example: 200000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bookingAmount!: number;

  @ApiProperty({ example: 7500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedPrice!: number;

  @ApiPropertyOptional({ example: 100000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Defaults to agreedPrice − discount',
    example: 7400000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedPrice?: number;

  @ApiPropertyOptional({ type: BookingPaymentPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPaymentPlanDto)
  paymentPlan?: BookingPaymentPlanDto;

  @ApiPropertyOptional({ type: BookingBrokerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingBrokerDto)
  broker?: BookingBrokerDto;

  @ApiProperty({ enum: CustomerFundingType })
  @IsEnum(CustomerFundingType)
  fundingType!: CustomerFundingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({
    description: 'Hold duration override in hours (default from config)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  holdHours?: number;
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}

export class TransitionBookingDto {
  @ApiProperty({
    enum: [
      BookingStatus.Reserved,
      BookingStatus.Booked,
      BookingStatus.Agreement,
      BookingStatus.Registered,
    ],
  })
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class ApproveBookingDiscountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class RejectBookingDiscountDto {
  @ApiProperty({ example: 'Discount exceeds policy' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ListBookingsQueryDto {
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

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
