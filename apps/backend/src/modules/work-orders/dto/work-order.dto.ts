import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BoqUnit } from '../../boq/schemas/boq.schema';
import {
  WorkOrderAmendmentStatus,
  WorkOrderAmendmentType,
} from '../schemas/work-order-amendment.schema';
import {
  WorkOrderResponsibility,
  WorkOrderStatus,
} from '../schemas/work-order.schema';

export class WorkOrderBoqLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional({ example: 'RCC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  boqCode?: string | null;

  @ApiProperty({ example: 'RCC columns' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;
}

export class WorkOrderMilestoneDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class WorkOrderPaymentTermsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  advancePercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  billingCycle?: string | null;
}

export class WorkOrderRetentionDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class WorkOrderRecoveryDto {
  @ApiProperty({ example: 'advance' })
  @IsString()
  @MaxLength(80)
  type!: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  rateContractId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  agreementId?: string | null;

  @ApiProperty({ type: [WorkOrderBoqLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderBoqLineDto)
  boqScopeLines!: WorkOrderBoqLineDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ type: [WorkOrderMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderMilestoneDto)
  milestones?: WorkOrderMilestoneDto[];

  @ApiPropertyOptional({ type: WorkOrderPaymentTermsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkOrderPaymentTermsDto)
  paymentTerms?: WorkOrderPaymentTermsDto;

  @ApiPropertyOptional({ type: WorkOrderRetentionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkOrderRetentionDto)
  retention?: WorkOrderRetentionDto;

  @ApiPropertyOptional({ type: [WorkOrderRecoveryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderRecoveryDto)
  recoveries?: WorkOrderRecoveryDto[];

  @ApiPropertyOptional({ enum: WorkOrderResponsibility })
  @IsOptional()
  @IsEnum(WorkOrderResponsibility)
  materialResponsibility?: WorkOrderResponsibility;

  @ApiPropertyOptional({ enum: WorkOrderResponsibility })
  @IsOptional()
  @IsEnum(WorkOrderResponsibility)
  labourResponsibility?: WorkOrderResponsibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  drawingIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  terms?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateWorkOrderDto extends PartialType(
  OmitType(CreateWorkOrderDto, ['projectId', 'contractorId'] as const),
) {}

export class CreateWorkOrderAmendmentDto {
  @ApiProperty({ enum: WorkOrderAmendmentType })
  @IsEnum(WorkOrderAmendmentType)
  type!: WorkOrderAmendmentType;

  @ApiProperty({ example: 'Quantity increase for foundation block B' })
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({ type: [WorkOrderBoqLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderBoqLineDto)
  boqScopeLines?: WorkOrderBoqLineDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [WorkOrderMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderMilestoneDto)
  milestones?: WorkOrderMilestoneDto[];

  @ApiPropertyOptional({ type: WorkOrderPaymentTermsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkOrderPaymentTermsDto)
  paymentTerms?: WorkOrderPaymentTermsDto;

  @ApiPropertyOptional({ type: WorkOrderRetentionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkOrderRetentionDto)
  retention?: WorkOrderRetentionDto;

  @ApiPropertyOptional({ type: [WorkOrderRecoveryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderRecoveryDto)
  recoveries?: WorkOrderRecoveryDto[];

  @ApiPropertyOptional({ enum: WorkOrderResponsibility })
  @IsOptional()
  @IsEnum(WorkOrderResponsibility)
  materialResponsibility?: WorkOrderResponsibility;

  @ApiPropertyOptional({ enum: WorkOrderResponsibility })
  @IsOptional()
  @IsEnum(WorkOrderResponsibility)
  labourResponsibility?: WorkOrderResponsibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  drawingIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  terms?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  /** Explicit revised contract value override (optional; else Σ lines). */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revisedValue?: number;
}

export class RejectWorkOrderAmendmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class CancelWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class ListWorkOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;
}

export class ListWorkOrderAmendmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WorkOrderAmendmentStatus })
  @IsOptional()
  @IsEnum(WorkOrderAmendmentStatus)
  status?: WorkOrderAmendmentStatus;
}
