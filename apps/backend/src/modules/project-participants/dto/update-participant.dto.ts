import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CreateParticipantDto } from './create-participant.dto';
import { InstrumentType } from '../schemas/project-participant.schema';

/** Draft-only field updates (profit-share % changes on approved rows use createVersion). */
export class UpdateParticipantDto extends PartialType(
  OmitType(CreateParticipantDto, [
    'participantType',
    'participantId',
  ] as const),
) {
  @ApiPropertyOptional({ enum: InstrumentType })
  @IsOptional()
  @IsEnum(InstrumentType)
  override instrumentType?: InstrumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  override approvedProfitSharePercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  override lossSharePercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  override interestRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  override commitmentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  override actualContributionAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  override expectedContributionDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  override effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  override agreementDocumentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  override notes?: string | null;
}
