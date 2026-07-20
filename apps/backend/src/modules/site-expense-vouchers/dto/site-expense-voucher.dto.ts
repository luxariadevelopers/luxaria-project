import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
} from '../schemas/site-expense-voucher.schema';

export class SiteExpenseAttachmentDto {
  @ApiProperty({ enum: SiteExpenseAttachmentType })
  @IsEnum(SiteExpenseAttachmentType)
  type!: SiteExpenseAttachmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  filePath?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  documentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string | null;
}

export class CreateSiteExpenseVoucherDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  pettyCashAccountId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  expenseDate!: string;

  @ApiProperty()
  @IsMongoId()
  expenseCategoryId!: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  paidTo!: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string | null;

  @ApiProperty({ example: 'Site labour for block A scaffolding' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  purpose!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  boqItemId?: string | null;

  @ApiProperty({ enum: SiteExpensePaymentMode })
  @IsEnum(SiteExpensePaymentMode)
  paymentMode!: SiteExpensePaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  billNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  billDate?: string | null;

  @ApiPropertyOptional({ type: [SiteExpenseAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SiteExpenseAttachmentDto)
  attachments?: SiteExpenseAttachmentDto[];

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string | null;
}

export class UpdateSiteExpenseVoucherDto extends PartialType(
  OmitType(CreateSiteExpenseVoucherDto, ['projectId'] as const),
) {}

export class RejectSiteExpenseVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

export class CancelSiteExpenseVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  cancellationReason!: string;
}

export class ReturnSiteExpenseVoucherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null;
}

export class ListSiteExpenseVouchersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  pettyCashAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  expenseCategoryId?: string;

  @ApiPropertyOptional({ enum: SiteExpenseVoucherStatus })
  @IsOptional()
  @IsEnum(SiteExpenseVoucherStatus)
  status?: SiteExpenseVoucherStatus;
}
