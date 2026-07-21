import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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
import { SaleAgreementStatus } from '../schemas/sale-agreement.schema';

export class StampPaperDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  series?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  number?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchasedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number | null;
}

export class PaymentScheduleLineDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  sequence!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percent?: number | null;
}

export class AgreementMilestoneDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number | null;
}

export class AgreementClauseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20000)
  body!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order!: number;
}

export class CreateSaleAgreementDto {
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

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreementValue!: number;

  @ApiPropertyOptional({ type: StampPaperDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StampPaperDto)
  stampPaper?: StampPaperDto;

  @ApiPropertyOptional({ type: [PaymentScheduleLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineDto)
  paymentScheduleSnapshot?: PaymentScheduleLineDto[];

  @ApiPropertyOptional({ type: [AgreementMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgreementMilestoneDto)
  milestones?: AgreementMilestoneDto[];

  @ApiPropertyOptional({ type: [AgreementClauseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgreementClauseDto)
  clauses?: AgreementClauseDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateSaleAgreementDto extends PartialType(
  OmitType(CreateSaleAgreementDto, [
    'companyId',
    'projectId',
    'bookingId',
    'customerId',
    'unitId',
  ] as const),
) {}

export class ReviseSaleAgreementDto extends UpdateSaleAgreementDto {}

export class RejectSaleAgreementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ListSaleAgreementsQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  rootAgreementId?: string;

  @ApiPropertyOptional({ enum: SaleAgreementStatus })
  @IsOptional()
  @IsEnum(SaleAgreementStatus)
  status?: SaleAgreementStatus;
}
