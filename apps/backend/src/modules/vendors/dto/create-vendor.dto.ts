import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
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
import { IFSC_REGEX } from '../vendors.validation';

export class VendorContactDto {
  @ApiPropertyOptional()
  @ValidateIf((o: VendorContactDto) => !!o.email)
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

export class VendorBillingAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string | null;

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

export class VendorBankDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchName?: string | null;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @ValidateIf((o: VendorBankDetailsDto) => !!o.ifsc)
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

export class CreateVendorDto {
  @ApiProperty({ example: 'Southern Steels Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  legalName!: string;

  @ApiPropertyOptional({ example: 'Southern Steels' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string | null;

  @ApiPropertyOptional({ example: '33ABCDE1234F1Z5' })
  @ValidateIf((o: CreateVendorDto) => !!o.gstin)
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: 'gstin must be a valid GSTIN' })
  gstin?: string | null;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CreateVendorDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({ type: VendorContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VendorContactDto)
  contact?: VendorContactDto;

  @ApiPropertyOptional({ type: VendorBillingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VendorBillingAddressDto)
  billingAddress?: VendorBillingAddressDto;

  @ApiPropertyOptional({ type: VendorBankDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VendorBankDetailsDto)
  bankDetails?: VendorBankDetailsDto;

  @ApiPropertyOptional({
    type: [String],
    example: ['cement', 'steel', 'electrical'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  materialCategories?: string[];

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentTerms?: string | null;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  tdsApplicable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  tdsPercentage?: number | null;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  retentionPercentage?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
