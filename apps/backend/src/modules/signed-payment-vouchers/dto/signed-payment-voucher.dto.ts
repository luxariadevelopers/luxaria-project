import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
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
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  SignedPaymentVoucherStatus,
  SignedPaymentVoucherType,
} from '../schemas/signed-payment-voucher.schema';

export class CreateSignedPaymentVoucherDto {
  @ApiProperty({ enum: SignedPaymentVoucherType })
  @IsEnum(SignedPaymentVoucherType)
  voucherType!: SignedPaymentVoucherType;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  pettyCashAccountId!: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  recipientName!: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  recipientMobile?: string | null;

  @ApiProperty({ example: 'Masonry work — Block A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  workDescription!: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  grossAmount!: number;

  @ApiPropertyOptional({ example: 200, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresWitnessSignature?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresRecipientPhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiProperty({ example: '2026-07-17T10:30:00.000Z' })
  @IsDateString()
  capturedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string | null;
}

export class UpdateSignedPaymentVoucherDto extends PartialType(
  OmitType(CreateSignedPaymentVoucherDto, [
    'projectId',
    'voucherType',
  ] as const),
) {}

export class AttachSignaturesDto {
  @ApiPropertyOptional({
    description: 'Active S3 StoredDocument id (recipient signature image)',
  })
  @IsOptional()
  @IsMongoId()
  recipientSignatureDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  engineerSignatureDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  witnessSignatureDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  recipientPhotoDocumentId?: string;
}

export class ReverseSignedPaymentVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'When true, creates a replacement draft voucher',
  })
  @IsOptional()
  @IsBoolean()
  createReplacement?: boolean;
}

export class CancelSignedPaymentVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  cancellationReason!: string;
}

export class ListSignedPaymentVouchersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: SignedPaymentVoucherType })
  @IsOptional()
  @IsEnum(SignedPaymentVoucherType)
  voucherType?: SignedPaymentVoucherType;

  @ApiPropertyOptional({ enum: SignedPaymentVoucherStatus })
  @IsOptional()
  @IsEnum(SignedPaymentVoucherStatus)
  status?: SignedPaymentVoucherStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  replacesVoucherId?: string;
}
