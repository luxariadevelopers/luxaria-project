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
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../schemas/cash-account.schema';

export class CreateCashAccountDto {
  @ApiProperty({ example: 'Site Petty Cash — Tower A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  accountName!: string;

  @ApiProperty({ enum: CashAccountKind, default: CashAccountKind.PettyCash })
  @IsEnum(CashAccountKind)
  kind!: CashAccountKind;

  @ApiProperty({ description: 'Project this site cash belongs to' })
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ description: 'Initial / active custodian user id' })
  @IsMongoId()
  custodianUserId!: string;

  @ApiProperty({
    description: 'COA ledger account (Cash or Petty Cash category)',
  })
  @IsMongoId()
  ledgerAccountId!: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumHoldingLimit!: number;

  @ApiProperty({
    example: 10000,
    description: 'Trigger level for replenishment requests',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replenishmentLevel!: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;
}

export class AssignCustodianDto {
  @ApiProperty()
  @IsMongoId()
  custodianUserId!: string;
}

export class InitiateCustodianTransferDto {
  @ApiProperty({ description: 'Incoming custodian user id' })
  @IsMongoId()
  toUserId!: string;

  @ApiPropertyOptional({
    description: 'Cash count declared at handover',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  declaredBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ConfirmHandoverDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the confirming party',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CloseCashAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListCashAccountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: CashAccountKind })
  @IsOptional()
  @IsEnum(CashAccountKind)
  kind?: CashAccountKind;

  @ApiPropertyOptional({ enum: CashAccountStatus })
  @IsOptional()
  @IsEnum(CashAccountStatus)
  status?: CashAccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  custodianUserId?: string;
}

export class CashLedgerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
