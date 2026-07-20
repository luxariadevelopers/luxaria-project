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

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

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

  @ApiPropertyOptional({ type: CustomerContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerContactDto)
  contact?: CustomerContactDto;

  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;

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

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
