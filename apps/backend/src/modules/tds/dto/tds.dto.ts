import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  TdsDeducteeType,
  TdsDeductionStatus,
  TdsPartyType,
} from '../schemas/tds-deduction.schema';
import { TdsReturnStatus, TdsFormType, TdsQuarter } from '../schemas/tds-return.schema';
import { TdsSectionStatus } from '../schemas/tds-section.schema';

export class CreateTdsSectionDto {
  @ApiProperty({ example: '194C' })
  @IsString()
  @MaxLength(16)
  sectionCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePercent!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  thresholdAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateTdsSectionDto extends PartialType(CreateTdsSectionDto) {
  @ApiPropertyOptional({ enum: TdsSectionStatus })
  @IsOptional()
  @IsEnum(TdsSectionStatus)
  status?: TdsSectionStatus;
}

export class ListTdsSectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TdsSectionStatus })
  @IsOptional()
  @IsEnum(TdsSectionStatus)
  status?: TdsSectionStatus;
}

export class CreateTdsDeductionDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty()
  @IsMongoId()
  sectionId!: string;

  @ApiProperty({ enum: TdsPartyType })
  @IsEnum(TdsPartyType)
  partyType!: TdsPartyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  partyId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  partyName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  partyPan?: string | null;

  @ApiProperty({ enum: TdsDeducteeType })
  @IsEnum(TdsDeducteeType)
  deducteeType!: TdsDeducteeType;

  @ApiProperty()
  @IsDateString()
  transactionDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transactionAmount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tdsAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceModule?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceEntityType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceEntityId?: string | null;
}

export class ListTdsDeductionsQueryDto extends PaginationQueryDto {
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
  @IsString()
  sectionCode?: string;

  @ApiPropertyOptional({ enum: TdsDeductionStatus })
  @IsOptional()
  @IsEnum(TdsDeductionStatus)
  status?: TdsDeductionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class MarkTdsDepositedDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  challanNumber!: string;

  @ApiProperty()
  @IsDateString()
  challanDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bsrCode?: string | null;
}

export class MarkTdsCertifiedDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  certificateNumber!: string;
}

export class CreateTdsReturnDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiProperty({ enum: TdsFormType })
  @IsEnum(TdsFormType)
  formType!: TdsFormType;

  @ApiProperty({ enum: TdsQuarter })
  @IsEnum(TdsQuarter)
  quarter!: TdsQuarter;

  @ApiProperty({ example: '2025-26' })
  @IsString()
  @MaxLength(16)
  financialYearLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class ListTdsReturnsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ enum: TdsFormType })
  @IsOptional()
  @IsEnum(TdsFormType)
  formType?: TdsFormType;

  @ApiPropertyOptional({ enum: TdsQuarter })
  @IsOptional()
  @IsEnum(TdsQuarter)
  quarter?: TdsQuarter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financialYearLabel?: string;

  @ApiPropertyOptional({ enum: TdsReturnStatus })
  @IsOptional()
  @IsEnum(TdsReturnStatus)
  status?: TdsReturnStatus;
}

export class FileTdsReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  acknowledgementNumber?: string | null;
}

export class TdsRegisterQueryDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionCode?: string;
}
