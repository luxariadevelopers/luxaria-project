import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BoqVersionType } from '../schemas/boq.schema';

export class CreateBoqVersionDto {
  @ApiProperty({ enum: BoqVersionType })
  @IsEnum(BoqVersionType)
  versionType!: BoqVersionType;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiProperty({ example: 'Baseline BOQ for Block A' })
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Required for revision / variation / change_order. Defaults to current active version.',
  })
  @IsOptional()
  @IsMongoId()
  basedOnVersionId?: string;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Defaults to computed planned-value delta vs based-on version',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costImpact?: number;

  @ApiPropertyOptional({
    example: 14,
    description: 'Schedule impact in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  timeImpact?: number;
}

export class UpdateBoqVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  timeImpact?: number;
}

export class ApproveBoqVersionDto {
  @ApiProperty({
    example: 'APR-BOQ-2026-0012',
    description: 'Approval reference / minute number',
  })
  @IsString()
  @MaxLength(120)
  approvalReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string | null;
}

export class RejectBoqVersionDto {
  @ApiProperty({ example: 'Cost impact exceeds contingency' })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class CompareBoqVersionsQueryDto {
  @ApiProperty({ description: 'Base / older version id' })
  @IsMongoId()
  fromVersionId!: string;

  @ApiProperty({ description: 'Target / newer version id' })
  @IsMongoId()
  toVersionId!: string;
}

export class ActivateBoqVersionDto {
  @ApiPropertyOptional({
    description: 'Optional approval reference when activating non-variation versions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  approvalReference?: string | null;
}
