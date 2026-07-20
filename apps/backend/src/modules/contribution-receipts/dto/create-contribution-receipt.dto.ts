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
  Min,
  MinLength,
} from 'class-validator';
import { ContributionPaymentMode } from '../schemas/contribution-receipt.schema';

export class CreateContributionReceiptDto {
  @ApiProperty({ description: 'Approved project participant record id' })
  @IsMongoId()
  participantId!: string;

  @ApiProperty({ description: 'Approved contribution commitment id' })
  @IsMongoId()
  commitmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ContributionPaymentMode })
  @IsEnum(ContributionPaymentMode)
  paymentMode!: ContributionPaymentMode;

  @ApiPropertyOptional({
    description: 'Receiving bank account id (required for bank_transfer / cheque)',
  })
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string | null;

  @ApiPropertyOptional({ example: 'NEFT123456789' })
  @IsOptional()
  @IsString()
  transactionReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class CancelContributionReceiptDto {
  @ApiProperty({ example: 'Entered against wrong commitment' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  cancellationReason!: string;
}
