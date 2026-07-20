import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BankReconciliationAdjustmentType } from '../bank-reconciliation.constants';

export class StatementColumnMappingDto {
  @ApiProperty({ example: 'Txn Date' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ example: 'Narration' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Withdrawal' })
  @IsOptional()
  @IsString()
  debit?: string;

  @ApiPropertyOptional({ example: 'Deposit' })
  @IsOptional()
  @IsString()
  credit?: string;

  @ApiPropertyOptional({
    example: 'Amount',
    description: 'Signed amount if debit/credit columns are not separate',
  })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: 'Balance' })
  @IsOptional()
  @IsString()
  balance?: string;

  @ApiPropertyOptional({ example: 'UTR / Ref No' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ example: 'Cheque No' })
  @IsOptional()
  @IsString()
  chequeNumber?: string;
}

export class CreateReconciliationSessionDto {
  @ApiProperty()
  @IsMongoId()
  bankAccountId!: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  statementFrom!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  statementTo!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  statementOpeningBalance?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  statementClosingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ImportStatementDto {
  @ApiProperty({ type: StatementColumnMappingDto })
  @ValidateNested()
  @Type(() => StatementColumnMappingDto)
  columnMapping!: StatementColumnMappingDto;

  @ApiPropertyOptional({
    description: 'Replace existing imported lines for this session',
    default: false,
  })
  @IsOptional()
  replaceExisting?: boolean;
}

export class BookLineRefDto {
  @ApiProperty()
  @IsMongoId()
  journalId!: string;

  @ApiProperty()
  @IsMongoId()
  journalLineId!: string;
}

export class ManualMatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  statementLineIds!: string[];

  @ApiProperty({ type: [BookLineRefDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookLineRefDto)
  bookLines!: BookLineRefDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AutoMatchDto {
  @ApiPropertyOptional({
    description: 'Date tolerance in days for amount+date matching',
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dateToleranceDays?: number;
}

export class PostAdjustmentDto {
  @ApiProperty({ enum: BankReconciliationAdjustmentType })
  @IsEnum(BankReconciliationAdjustmentType)
  adjustmentType!: BankReconciliationAdjustmentType;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  journalDate!: string;

  @ApiProperty({ example: 250 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'Bank charges for July' })
  @IsString()
  @MaxLength(500)
  narration!: string;

  @ApiPropertyOptional({
    description:
      'Offset account (defaults: interest income/expense or indirect expense)',
  })
  @IsOptional()
  @IsMongoId()
  offsetAccountId?: string;

  @ApiPropertyOptional({
    description: 'Optional statement line to auto-match after posting',
  })
  @IsOptional()
  @IsMongoId()
  statementLineId?: string;
}

export class UpdateColumnMappingDto {
  @ApiProperty({ type: StatementColumnMappingDto })
  @IsObject()
  @ValidateNested()
  @Type(() => StatementColumnMappingDto)
  columnMapping!: StatementColumnMappingDto;
}
