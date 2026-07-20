import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContractorBillStatus } from '../schemas/contractor-bill.schema';

export class BillingPeriodDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  to!: string;
}

export class CreateContractorBillDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty()
  @IsMongoId()
  agreementId!: string;

  @ApiProperty({ type: BillingPeriodDto })
  @ValidateNested()
  @Type(() => BillingPeriodDto)
  billingPeriod!: BillingPeriodDto;

  @ApiProperty({
    type: [String],
    description: 'Verified work measurement IDs to include',
  })
  @IsArray()
  @IsMongoId({ each: true })
  measurementIds!: string[];

  @ApiPropertyOptional({
    description: 'Override computed advance recovery (still capped)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceRecovery?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  materialRecovery?: number;

  @ApiPropertyOptional({
    description: 'Override retention; default = agreement % of current value',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retention?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @ApiPropertyOptional({ description: 'Document id / path for invoice' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invoiceDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateContractorBillDto {
  @ApiPropertyOptional({ type: BillingPeriodDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingPeriodDto)
  billingPeriod?: BillingPeriodDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  measurementIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceRecovery?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  materialRecovery?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retention?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invoiceDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class RejectContractorBillDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class WorkflowNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ListContractorBillsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  agreementId?: string;

  @ApiPropertyOptional({ enum: ContractorBillStatus })
  @IsOptional()
  @IsEnum(ContractorBillStatus)
  status?: ContractorBillStatus;
}
