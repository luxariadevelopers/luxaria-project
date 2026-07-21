import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
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
import { BoqUnit } from '../../boq/schemas/boq.schema';
import {
  RateContractScope,
  RateContractStatus,
} from '../schemas/rate-contract.schema';

export class RateContractBoqItemRateDto {
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

  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class RateContractLabourRateDto {
  @ApiProperty({ example: 'mason' })
  @IsString()
  @MaxLength(80)
  skill!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty({ example: 850 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class RateContractMaterialInclusiveRateDto {
  @ApiProperty({ example: 'Plastering including cement & sand' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includesMaterials?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class RateContractEquipmentRateDto {
  @ApiProperty({ example: 'excavator_20t' })
  @IsString()
  @MaxLength(120)
  equipmentType!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty({ example: 3500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  withOperator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fuelInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class RateContractEscalationClauseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  indexName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  formula?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  baseDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class RateContractTaxConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gstInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  tdsPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class RateContractAdvanceRecoveryDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startAfterBillNumber?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class RateContractPenaltyRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ldPercentPerDay?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ldCapPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class RateContractSecurityDepositDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percent?: number | null;

  @ApiPropertyOptional({ example: 'bank_guarantee' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  instrumentType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateRateContractDto {
  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty({ enum: RateContractScope })
  @IsEnum(RateContractScope)
  scope!: RateContractScope;

  @ApiPropertyOptional({
    description: 'Required when scope=project; omit/null for company-wide',
  })
  @ValidateIf((o: CreateRateContractDto) => o.scope === RateContractScope.Project)
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string | null;

  @ApiPropertyOptional({ type: [RateContractBoqItemRateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateContractBoqItemRateDto)
  boqItemRates?: RateContractBoqItemRateDto[];

  @ApiPropertyOptional({ type: [RateContractLabourRateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateContractLabourRateDto)
  labourRates?: RateContractLabourRateDto[];

  @ApiPropertyOptional({ type: [RateContractMaterialInclusiveRateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateContractMaterialInclusiveRateDto)
  materialInclusiveRates?: RateContractMaterialInclusiveRateDto[];

  @ApiPropertyOptional({ type: [RateContractEquipmentRateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateContractEquipmentRateDto)
  equipmentRates?: RateContractEquipmentRateDto[];

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  validityFrom!: string;

  @ApiProperty({ example: '2027-07-31' })
  @IsDateString()
  validityTo!: string;

  @ApiPropertyOptional({ type: [RateContractEscalationClauseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateContractEscalationClauseDto)
  escalationClauses?: RateContractEscalationClauseDto[];

  @ApiPropertyOptional({ type: RateContractTaxConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateContractTaxConfigDto)
  taxConfig?: RateContractTaxConfigDto;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  retentionPercent?: number;

  @ApiPropertyOptional({ type: RateContractSecurityDepositDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateContractSecurityDepositDto)
  securityDeposit?: RateContractSecurityDepositDto;

  @ApiPropertyOptional({ type: RateContractAdvanceRecoveryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateContractAdvanceRecoveryDto)
  advanceRecovery?: RateContractAdvanceRecoveryDto;

  @ApiPropertyOptional({ type: RateContractPenaltyRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateContractPenaltyRulesDto)
  penaltyRules?: RateContractPenaltyRulesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

export class UpdateRateContractDto extends PartialType(CreateRateContractDto) {}

export class ListRateContractsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: RateContractScope })
  @IsOptional()
  @IsEnum(RateContractScope)
  scope?: RateContractScope;

  @ApiPropertyOptional({ enum: RateContractStatus })
  @IsOptional()
  @IsEnum(RateContractStatus)
  status?: RateContractStatus;

  @ApiPropertyOptional({ description: 'Search contract number or title' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class TerminateRateContractDto {
  @ApiProperty({ example: 'Contractor blacklisted' })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class SupersedeRateContractDto extends PartialType(CreateRateContractDto) {}
