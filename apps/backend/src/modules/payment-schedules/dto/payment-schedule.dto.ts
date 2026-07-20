import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PaymentScheduleStatus,
  PaymentScheduleType,
} from '../schemas/payment-schedule.schema';

export class PaymentScheduleLineDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  sequence!: number;

  @ApiProperty({ example: 'On booking / Foundation' })
  @IsString()
  @IsNotEmpty()
  milestone!: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @ApiProperty({ example: 800000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 40000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class GeneratePaymentScheduleDto {
  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty({ enum: PaymentScheduleType })
  @IsEnum(PaymentScheduleType)
  scheduleType!: PaymentScheduleType;

  @ApiPropertyOptional({
    type: [PaymentScheduleLineDto],
    description:
      'Required unless seeding from booking.paymentPlan (date_based / custom)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineDto)
  lines?: PaymentScheduleLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({
    description: 'Submit for approval immediately after generate',
    default: false,
  })
  @IsOptional()
  submit?: boolean;
}

export class RevisePaymentScheduleDto {
  @ApiPropertyOptional({ enum: PaymentScheduleType })
  @IsOptional()
  @IsEnum(PaymentScheduleType)
  scheduleType?: PaymentScheduleType;

  @ApiProperty({ type: [PaymentScheduleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineDto)
  lines!: PaymentScheduleLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({
    description: 'Submit revision for approval immediately',
    default: true,
  })
  @IsOptional()
  submit?: boolean;
}

export class ApprovePaymentScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class RejectPaymentScheduleDto {
  @ApiProperty({ example: 'Installment mix not acceptable' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class GenerateDemandDto {
  @ApiProperty({ description: 'Schedule line id' })
  @IsMongoId()
  lineId!: string;

  @ApiPropertyOptional({
    description: 'Override due date on the demand (defaults to line dueDate)',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class MarkDueDto {
  @ApiProperty({ description: 'Schedule line id' })
  @IsMongoId()
  lineId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class ListPaymentSchedulesQueryDto {
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

  @ApiPropertyOptional({ enum: PaymentScheduleStatus })
  @IsOptional()
  @IsEnum(PaymentScheduleStatus)
  status?: PaymentScheduleStatus;

  @ApiPropertyOptional({ enum: PaymentScheduleType })
  @IsOptional()
  @IsEnum(PaymentScheduleType)
  scheduleType?: PaymentScheduleType;

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
