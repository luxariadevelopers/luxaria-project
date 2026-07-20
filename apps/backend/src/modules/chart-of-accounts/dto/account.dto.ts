import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  AccountCategory,
  AccountStatus,
  AccountType,
} from '../schemas/account.schema';

export class CreateAccountDto {
  @ApiProperty({ example: '1111', description: 'Unique account code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'accountCode must be alphanumeric (underscore/hyphen allowed)',
  })
  accountCode!: string;

  @ApiProperty({ example: 'HDFC Current Account' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  accountName!: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType!: AccountType;

  @ApiProperty({ enum: AccountCategory })
  @IsEnum(AccountCategory)
  accountCategory!: AccountCategory;

  @ApiPropertyOptional({ description: 'Parent account for hierarchy' })
  @IsOptional()
  @IsMongoId()
  parentAccountId?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isControlAccount?: boolean;

  @ApiPropertyOptional({
    description:
      'Defaults to false when isControlAccount is true, otherwise true',
  })
  @IsOptional()
  @IsBoolean()
  allowManualPosting?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresProject?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresParty?: boolean;
}

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['accountCode'] as const),
) {}

export class SetAccountParentDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Null moves the account to root level',
  })
  @IsOptional()
  @IsMongoId()
  parentAccountId?: string | null;
}

export class ListAccountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiPropertyOptional({ enum: AccountCategory })
  @IsOptional()
  @IsEnum(AccountCategory)
  accountCategory?: AccountCategory;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentAccountId?: string;

  @ApiPropertyOptional({ description: 'When true, only root accounts' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rootsOnly?: boolean;
}
