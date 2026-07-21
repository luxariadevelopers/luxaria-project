import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PAN_REGEX } from '../../company/company.validation';
import {
  CustomerFundingType,
  CustomerStatus,
  CustomerType,
} from '../schemas/customer.schema';

export class CustomerContactDto {
  @ApiPropertyOptional()
  @ValidateIf((o: CustomerContactDto) => !!o.email)
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
}

export class CustomerAddressDto {
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

export class CustomerJointApplicantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string | null;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CustomerJointApplicantDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'jointApplicant.pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({
    description: 'Full 12-digit Aadhaar — encrypted at rest; only last-4 stored as reference',
    example: '123456789012',
  })
  @IsOptional()
  @IsString()
  aadhaar?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: CustomerJointApplicantDto) => !!o.email)
  @IsOptional()
  @IsEmail()
  email?: string | null;
}

export class CustomerBankDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifsc?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string | null;
}

export class CustomerNomineeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;
}

export class CustomerCommunicationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  sms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  whatsapp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  postal?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.Individual })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({ type: CustomerJointApplicantDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerJointApplicantDto)
  jointApplicant?: CustomerJointApplicantDto;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CreateCustomerDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({
    description: 'Full 12-digit Aadhaar — encrypted at rest; only last-4 exposed as aadhaarReference',
    example: '234567890123',
  })
  @IsOptional()
  @IsString()
  aadhaar?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passportNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string | null;

  @ApiPropertyOptional({ type: CustomerContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerContactDto)
  contact?: CustomerContactDto;

  @ApiPropertyOptional({ type: [CustomerContactDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactDto)
  additionalContacts?: CustomerContactDto[];

  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;

  @ApiPropertyOptional({ type: CustomerBankDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerBankDetailsDto)
  bankDetails?: CustomerBankDetailsDto;

  @ApiPropertyOptional({ type: CustomerNomineeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerNomineeDto)
  nominee?: CustomerNomineeDto;

  @ApiPropertyOptional({ type: CustomerCommunicationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerCommunicationPreferencesDto)
  communicationPreferences?: CustomerCommunicationPreferencesDto;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  occupation?: string | null;

  @ApiProperty({ enum: CustomerFundingType })
  @IsEnum(CustomerFundingType)
  fundingType!: CustomerFundingType;

  @ApiPropertyOptional({
    description: 'Required for bank_loan and mixed funding',
    example: 'HDFC Bank',
  })
  @IsOptional()
  @IsString()
  loanBank?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  sourceLeadId?: string | null;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
