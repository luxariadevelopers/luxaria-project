import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CIN_REGEX,
  GSTIN_REGEX,
  PAN_REGEX,
} from '../../company/company.validation';
import { InvestorStatus, InvestorType } from '../schemas/investor.schema';
import { IFSC_REGEX } from '../investors.validation';

export class InvestorContactDto {
  @ApiPropertyOptional()
  @ValidateIf((o: InvestorContactDto) => !!o.email)
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

export class InvestorBankDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchName?: string | null;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @ValidateIf((o: InvestorBankDetailsDto) => !!o.ifsc)
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

export class InvestorNomineeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: InvestorNomineeDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'nominee.pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: InvestorNomineeDto) => !!o.email)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercent?: number | null;
}

export class CreateInvestorDto {
  @ApiProperty({ enum: InvestorType })
  @IsEnum(InvestorType)
  investorType!: InvestorType;

  @ApiProperty({ example: 'Acme Holdings LLP' })
  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CreateInvestorDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({ example: '33ABCDE1234F1Z5' })
  @ValidateIf((o: CreateInvestorDto) => !!o.gstin)
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: 'gstin must be a valid GSTIN' })
  gstin?: string | null;

  @ApiPropertyOptional({ example: 'U45200TN2020PTC123456' })
  @ValidateIf((o: CreateInvestorDto) => !!o.cin)
  @IsOptional()
  @IsString()
  @Matches(CIN_REGEX, { message: 'cin must be a valid CIN' })
  cin?: string | null;

  @ApiPropertyOptional({ description: 'Linked portal user' })
  @IsOptional()
  @IsMongoId()
  userId?: string | null;

  @ApiPropertyOptional({
    description: 'Required when investorType is director_as_project_investor',
  })
  @IsOptional()
  @IsMongoId()
  directorId?: string | null;

  @ApiPropertyOptional({ type: InvestorContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvestorContactDto)
  contact?: InvestorContactDto;

  @ApiPropertyOptional({ type: InvestorBankDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvestorBankDetailsDto)
  bankDetails?: InvestorBankDetailsDto;

  @ApiPropertyOptional({ type: InvestorNomineeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvestorNomineeDto)
  nominee?: InvestorNomineeDto;

  @ApiPropertyOptional({ enum: InvestorStatus })
  @IsOptional()
  @IsEnum(InvestorStatus)
  status?: InvestorStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
