import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  ContractorAgreementBillingCycle,
  ContractorAgreementExpiryAlertType,
  ContractorAgreementStatus,
} from '../schemas/contractor-agreement.schema';

export class AgreementBoqItemDto {
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
  agreedQuantity!: number;

  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedRate!: number;
}

export class AgreementSkillMixDto {
  @ApiProperty({ example: 'mason' })
  @IsString()
  @MaxLength(80)
  skill!: string;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  headcount!: number;
}

export class AgreementAdvanceDto {
  @ApiProperty({ example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  terms?: string | null;
}

export class AgreementRecoveryPlanDto {
  @ApiPropertyOptional({ example: 'percent_per_bill' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  method?: string | null;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentPerBill?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateContractorAgreementDto {
  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: 'Civil finishing works for Block A' })
  @IsString()
  @MaxLength(4000)
  workScope!: string;

  @ApiProperty({ type: [AgreementBoqItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AgreementBoqItemDto)
  boqItems!: AgreementBoqItemDto[];

  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  manpowerCommitment!: number;

  @ApiPropertyOptional({ type: [AgreementSkillMixDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgreementSkillMixDto)
  skillMix?: AgreementSkillMixDto[];

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-01-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    enum: ContractorAgreementBillingCycle,
    example: ContractorAgreementBillingCycle.Monthly,
  })
  @IsEnum(ContractorAgreementBillingCycle)
  billingCycle!: ContractorAgreementBillingCycle;

  @ApiPropertyOptional({ type: AgreementAdvanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgreementAdvanceDto)
  advance?: AgreementAdvanceDto;

  @ApiPropertyOptional({ type: AgreementRecoveryPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgreementRecoveryPlanDto)
  recoveryPlan?: AgreementRecoveryPlanDto;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  retentionPercentage!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  penalties?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  safetyTerms?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  terminationTerms?: string | null;

  @ApiPropertyOptional({
    description: 'Document id or path for signed agreement PDF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  agreementDocument?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateContractorAgreementDto extends PartialType(
  CreateContractorAgreementDto,
) {}

export class AmendContractorAgreementDto extends PartialType(
  CreateContractorAgreementDto,
) {}

export class ApproveContractorAgreementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null;
}

export class RejectContractorAgreementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class TerminateContractorAgreementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class ListContractorAgreementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ enum: ContractorAgreementStatus })
  @IsOptional()
  @IsEnum(ContractorAgreementStatus)
  status?: ContractorAgreementStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementNumber?: string;
}

export class ListExpiryAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: ContractorAgreementExpiryAlertType })
  @IsOptional()
  @IsEnum(ContractorAgreementExpiryAlertType)
  alertType?: ContractorAgreementExpiryAlertType;

  @ApiPropertyOptional({ description: 'When true, only unacknowledged' })
  @IsOptional()
  unacknowledgedOnly?: boolean;
}

/** Post mobilisation advance: Dr Contractor Advance / Cr Bank. */
export class DisburseMobilisationAdvanceDto {
  @ApiProperty()
  @IsMongoId()
  bankAccountId!: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({ example: 'ADV-UTR-001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionReference?: string;
}
