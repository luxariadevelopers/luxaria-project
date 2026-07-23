import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  InstrumentType,
  ParticipantType,
  RepaymentMode,
} from '../schemas/project-participant.schema';

export class CreateParticipantDto {
  @ApiProperty({ enum: ParticipantType })
  @IsEnum(ParticipantType)
  participantType!: ParticipantType;

  @ApiProperty({
    description:
      'Director / Investor / Company id (JV party: Company or Investor)',
  })
  @IsMongoId()
  participantId!: string;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commitmentAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedContributionDate?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualContributionAmount?: number;

  @ApiProperty({
    example: 25,
    description: 'Project profit share % (not company equity shareholding)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  approvedProfitSharePercentage!: number;

  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  lossSharePercentage!: number;

  @ApiPropertyOptional({
    description:
      'Required for loan instruments when repaymentMode is with_interest (or unset)',
    example: 12,
  })
  @ValidateIf(
    (o: CreateParticipantDto) =>
      (o.instrumentType === InstrumentType.DirectorLoan ||
        o.instrumentType === InstrumentType.UnsecuredLoan) &&
      o.repaymentMode !== RepaymentMode.Lumpsum,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number | null;

  @ApiPropertyOptional({
    description: '% of approved budget this party is expected to fund',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  budgetInvestmentPercentage?: number | null;

  @ApiPropertyOptional({ enum: RepaymentMode })
  @IsOptional()
  @IsEnum(RepaymentMode)
  repaymentMode?: RepaymentMode | null;

  @ApiProperty({ enum: InstrumentType })
  @IsEnum(InstrumentType)
  instrumentType!: InstrumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  agreementDocumentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateParticipantVersionDto {
  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commitmentAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedContributionDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualContributionAmount?: number;

  @ApiProperty({
    example: 30,
    description: 'New project profit share % — creates a new version',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  approvedProfitSharePercentage!: number;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  lossSharePercentage!: number;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: CreateParticipantVersionDto) =>
      o.repaymentMode !== RepaymentMode.Lumpsum &&
      (o.instrumentType === InstrumentType.DirectorLoan ||
        o.instrumentType === InstrumentType.UnsecuredLoan ||
        o.instrumentType === undefined),
  )
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number | null;

  @ApiPropertyOptional({
    description: '% of approved budget this party is expected to fund',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  budgetInvestmentPercentage?: number | null;

  @ApiPropertyOptional({ enum: RepaymentMode })
  @IsOptional()
  @IsEnum(RepaymentMode)
  repaymentMode?: RepaymentMode | null;

  @ApiPropertyOptional({ enum: InstrumentType })
  @IsOptional()
  @IsEnum(InstrumentType)
  instrumentType?: InstrumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  agreementDocumentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string | null;
}
