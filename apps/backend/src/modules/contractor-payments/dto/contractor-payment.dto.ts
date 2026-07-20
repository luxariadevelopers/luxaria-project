import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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
import {
  ContractorPaymentMode,
  ContractorPaymentStatus,
} from '../schemas/contractor-payment.schema';

export class ContractorPaymentAllocationDto {
  @ApiProperty({ description: 'Posted running-account bill id' })
  @IsMongoId()
  billId!: string;

  @ApiProperty({ example: 1000, description: 'Partial or full amount against bill' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateContractorPaymentDto {
  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ type: [ContractorPaymentAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractorPaymentAllocationDto)
  allocations!: ContractorPaymentAllocationDto[];

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({
    example: 1000,
    description: 'Gross AP reduction (must equal sum of allocations)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ContractorPaymentMode })
  @IsEnum(ContractorPaymentMode)
  paymentMode!: ContractorPaymentMode;

  @ApiProperty()
  @IsMongoId()
  bankAccountId!: string;

  @ApiProperty({ description: 'Bank UTR / cheque / transaction ID' })
  @IsString()
  @MaxLength(120)
  transactionReference!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retention?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceRecovery?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penalty?: number;

  @ApiPropertyOptional({ description: 'Document id / path for payment proof' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentProof?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateContractorPaymentDto {
  @ApiPropertyOptional({ type: [ContractorPaymentAllocationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractorPaymentAllocationDto)
  allocations?: ContractorPaymentAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: ContractorPaymentMode })
  @IsOptional()
  @IsEnum(ContractorPaymentMode)
  paymentMode?: ContractorPaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionReference?: string;

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
  retention?: number;

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
  penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentProof?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListContractorPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ enum: ContractorPaymentStatus })
  @IsOptional()
  @IsEnum(ContractorPaymentStatus)
  status?: ContractorPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  billId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
