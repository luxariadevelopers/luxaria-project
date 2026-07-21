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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BoqUnit } from '../../boq/schemas/boq.schema';
import { ContractorTenderStatus } from '../schemas/contractor-tender.schema';

export class CreateContractorTenderDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'BOQ package item ids' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  boqPackageIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  bidDeadline?: string | null;
}

export class InviteContractorsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  contractorIds!: string[];

  @ApiPropertyOptional({ description: 'Overrides draft bid deadline if set' })
  @IsOptional()
  @IsDateString()
  bidDeadline?: string | null;
}

export class TenderCommercialBidLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  boqCode?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ enum: BoqUnit })
  @IsEnum(BoqUnit)
  unit!: BoqUnit;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;
}

export class TenderTechnicalBidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  complianceNotes?: string | null;

  @ApiPropertyOptional({ description: '0–100 technical score' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  technicalScore?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  documentIds?: string[];
}

export class TenderCommercialBidDto {
  @ApiProperty({ type: [TenderCommercialBidLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TenderCommercialBidLineDto)
  lines!: TenderCommercialBidLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  validityDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class RecordBidDto {
  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiPropertyOptional({ type: TenderTechnicalBidDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenderTechnicalBidDto)
  technical?: TenderTechnicalBidDto;

  @ApiPropertyOptional({ type: TenderCommercialBidDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenderCommercialBidDto)
  commercial?: TenderCommercialBidDto;
}

export class AddNegotiationNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  note!: string;
}

export class RecommendTenderDto {
  @ApiProperty()
  @IsMongoId()
  recommendedContractorId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  rationale!: string;
}

export class AwardTenderDto {
  @ApiProperty()
  @IsMongoId()
  awardedContractorId!: string;

  @ApiPropertyOptional({ description: 'Optional rate-contract id (W3)' })
  @IsOptional()
  @IsMongoId()
  awardedRateContractId?: string | null;

  @ApiPropertyOptional({ description: 'Optional contractor-agreement id' })
  @IsOptional()
  @IsMongoId()
  awardedAgreementId?: string | null;
}

export class CancelTenderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class ListContractorTendersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional({ enum: ContractorTenderStatus })
  @IsOptional()
  @IsEnum(ContractorTenderStatus)
  status?: ContractorTenderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  awardedContractorId?: string;
}
