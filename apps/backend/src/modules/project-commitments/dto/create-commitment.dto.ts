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
  Min,
  ValidateNested,
} from 'class-validator';
import { ContributionType } from '../schemas/contribution-commitment.schema';

export class PaymentScheduleLineDto {
  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string | null;
}

export class ExpectedBankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifsc?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string | null;

  @ApiPropertyOptional({ example: '9012' })
  @IsOptional()
  @IsString()
  accountNumberLast4?: string | null;
}

export class CreateCommitmentDto {
  @ApiProperty({
    description: 'Approved project participant record id',
  })
  @IsMongoId()
  participantId!: string;

  @ApiProperty({ example: 2500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commitmentAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  commitmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ enum: ContributionType })
  @IsEnum(ContributionType)
  contributionType!: ContributionType;

  @ApiPropertyOptional({ type: [PaymentScheduleLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineDto)
  paymentSchedule?: PaymentScheduleLineDto[];

  @ApiPropertyOptional({ type: ExpectedBankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpectedBankAccountDto)
  expectedBankAccount?: ExpectedBankAccountDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class AmendCommitmentDto {
  @ApiProperty({ example: 3000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commitmentAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: ContributionType })
  @IsOptional()
  @IsEnum(ContributionType)
  contributionType?: ContributionType;

  @ApiPropertyOptional({ type: [PaymentScheduleLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineDto)
  paymentSchedule?: PaymentScheduleLineDto[];

  @ApiPropertyOptional({ type: ExpectedBankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpectedBankAccountDto)
  expectedBankAccount?: ExpectedBankAccountDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementReference?: string | null;

  @ApiProperty({ example: 'Board-approved increase in commitment' })
  @IsString()
  @IsNotEmpty()
  remarks!: string;
}

export class RecordReceiptDto {
  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class CancelCommitmentDto {
  @ApiProperty({ example: 'Participant withdrew from the project' })
  @IsString()
  @IsNotEmpty()
  cancellationReason!: string;
}
