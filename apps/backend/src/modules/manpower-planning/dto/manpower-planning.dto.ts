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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ManpowerPlanSource } from '../schemas/manpower-plan.schema';
import { ManpowerShortfallAlertType } from '../schemas/manpower-shortfall-alert.schema';

export class ManpowerPlanSkillLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  labourCategoryId?: string | null;

  @ApiProperty({ example: 'Mason' })
  @IsString()
  @MaxLength(80)
  skill!: string;

  @ApiProperty({ example: 12, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedHeadcount!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;
}

export class CreateManpowerDailyPlanDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  agreementId?: string | null;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  planDate!: string;

  @ApiPropertyOptional({
    description: 'Total planned headcount; defaults to sum of skillMix',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedHeadcount?: number;

  @ApiPropertyOptional({ type: [ManpowerPlanSkillLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManpowerPlanSkillLineDto)
  skillMix?: ManpowerPlanSkillLineDto[];

  @ApiPropertyOptional({ enum: ManpowerPlanSource })
  @IsOptional()
  @IsEnum(ManpowerPlanSource)
  source?: ManpowerPlanSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      'When true and skillMix omitted, copy active agreement manpowerCommitment + skillMix',
  })
  @IsOptional()
  @IsBoolean()
  useAgreementDefaults?: boolean;
}

export class UpdateManpowerDailyPlanDto extends PartialType(
  CreateManpowerDailyPlanDto,
) {}

export class ListManpowerPlansQueryDto extends PaginationQueryDto {
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
  @IsDateString()
  planDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class ManpowerComparisonQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  asOfDate!: string;
}

export class EvaluateShortfallQueryDto {
  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;
}

export class ListShortfallAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ enum: ManpowerShortfallAlertType })
  @IsOptional()
  @IsEnum(ManpowerShortfallAlertType)
  alertType?: ManpowerShortfallAlertType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unacknowledgedOnly?: boolean;
}
