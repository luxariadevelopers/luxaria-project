import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  BankAccountStatus,
  BankAccountType,
} from '../schemas/company-bank-account.schema';

export class CreateCompanyBankAccountDto {
  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName!: string;

  @ApiPropertyOptional({ example: 'T Nagar' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  branch?: string | null;

  @ApiProperty({ example: 'Luxaria Developers Pvt. Ltd.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  accountHolderName!: string;

  @ApiProperty({
    example: '123456789012',
    description: 'Full account number — encrypted at rest; never returned unless bank.view_sensitive',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  @MaxLength(32)
  accountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  ifsc!: string;

  @ApiProperty({ enum: BankAccountType })
  @IsEnum(BankAccountType)
  accountType!: BankAccountType;

  @ApiPropertyOptional({
    description: 'Omit for company-level account; set for project-specific',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty({
    description: 'Linked chart-of-accounts bank ledger account id',
  })
  @IsMongoId()
  ledgerAccountId!: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Mark as default for the project (or company when projectId omitted)',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCompanyBankAccountDto extends PartialType(
  OmitType(CreateCompanyBankAccountDto, ['accountNumber'] as const),
) {
  @ApiPropertyOptional({
    description: 'Provide to rotate the encrypted account number',
  })
  @IsOptional()
  @IsString()
  @MinLength(9)
  @MaxLength(32)
  accountNumber?: string;
}

export class SetDefaultBankAccountDto {
  @ApiPropertyOptional({
    description:
      'Project to assign as default for. Defaults to the bank account projectId.',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;
}

export class ListCompanyBankAccountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BankAccountStatus })
  @IsOptional()
  @IsEnum(BankAccountStatus)
  status?: BankAccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'When true, only company-level accounts (no project)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  companyOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class BankLedgerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
