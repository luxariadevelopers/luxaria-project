import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  CorrespondenceDirection,
  CustomerLoanStatus,
} from '../schemas/customer-loan.schema';

export class PendingDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  filePath?: string | null;
}

export class CreateCustomerLoanDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  bankBranch?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  loanAccountNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sanctionAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sanctionedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sanctionLetterPath?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenureMonths?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  emiAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  emiStartDate?: string | null;

  @ApiPropertyOptional({ type: [PendingDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingDocumentDto)
  pendingDocuments?: PendingDocumentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateCustomerLoanDto extends PartialType(
  OmitType(CreateCustomerLoanDto, [
    'companyId',
    'projectId',
    'bookingId',
    'customerId',
    'unitId',
  ] as const),
) {}

export class TransitionCustomerLoanDto {
  @ApiProperty({ enum: CustomerLoanStatus })
  @IsEnum(CustomerLoanStatus)
  status!: CustomerLoanStatus;
}

export class AddLoanDisbursementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  stage!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsDateString()
  disbursedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class AddLoanCorrespondenceDto {
  @ApiProperty()
  @IsDateString()
  at!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  body!: string;

  @ApiProperty({ enum: CorrespondenceDirection })
  @IsEnum(CorrespondenceDirection)
  direction!: CorrespondenceDirection;
}

export class UpdatePendingDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  filePath?: string | null;
}

export class ListCustomerLoanQueryDto extends PaginationQueryDto {
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
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string;

  @ApiPropertyOptional({ enum: CustomerLoanStatus })
  @IsOptional()
  @IsEnum(CustomerLoanStatus)
  status?: CustomerLoanStatus;
}
