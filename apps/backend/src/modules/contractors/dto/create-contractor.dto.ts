import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  GSTIN_REGEX,
  PAN_REGEX,
} from '../../company/company.validation';
import { IFSC_REGEX } from '../contractors.validation';
import { ContractorType } from '../schemas/contractor.schema';

export class ContractorContactDto {
  @ApiPropertyOptional()
  @ValidateIf((o: ContractorContactDto) => !!o.email)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pincode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string | null;
}

export class ContractorBankDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchName?: string | null;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @ValidateIf((o: ContractorBankDetailsDto) => !!o.ifsc)
  @IsOptional()
  @IsString()
  @Matches(IFSC_REGEX, { message: 'ifsc must be a valid IFSC' })
  ifsc?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string | null;

  @ApiPropertyOptional({
    description: 'Plain account number — encrypted at rest',
    example: '123456789012',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string | null;
}

export class ContractorLabourLicenceDto {
  @ApiPropertyOptional({ example: 'LL-TN-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  licenceNumber?: string | null;

  @ApiPropertyOptional({ example: 'Labour Department, TN' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedBy?: string | null;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateContractorDto {
  @ApiProperty({ example: 'Sunrise Civil Contractors Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  legalName!: string;

  @ApiPropertyOptional({ example: 'Sunrise Civil' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string | null;

  @ApiProperty({ enum: ContractorType, example: ContractorType.Civil })
  @IsEnum(ContractorType)
  contractorType!: ContractorType;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CreateContractorDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({ example: '33ABCDE1234F1Z5' })
  @ValidateIf((o: CreateContractorDto) => !!o.gstin)
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: 'gstin must be a valid GSTIN' })
  gstin?: string | null;

  @ApiPropertyOptional({ type: ContractorContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractorContactDto)
  contact?: ContractorContactDto;

  @ApiPropertyOptional({ type: ContractorBankDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractorBankDetailsDto)
  bankDetails?: ContractorBankDetailsDto;

  @ApiPropertyOptional({ type: ContractorLabourLicenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractorLabourLicenceDto)
  labourLicence?: ContractorLabourLicenceDto;

  @ApiPropertyOptional({
    type: [String],
    example: ['brickwork', 'plastering', 'rcc'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  workCategories?: string[];

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
