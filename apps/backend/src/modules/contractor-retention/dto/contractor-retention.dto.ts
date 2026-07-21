import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  RetentionKind,
  RetentionReleaseStage,
  RetentionStatus,
} from '../schemas/contractor-retention.schema';

export class CreateContractorRetentionDto {
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

  @ApiPropertyOptional({
    description: 'Required for deductions — source posted RA bill',
  })
  @ValidateIf((o: CreateContractorRetentionDto) => o.kind === RetentionKind.Deduction)
  @IsMongoId()
  billId?: string | null;

  @ApiProperty({ enum: RetentionKind })
  @IsEnum(RetentionKind)
  kind!: RetentionKind;

  @ApiProperty({
    description:
      'Max retention hold for contractor+project(+agreement). Deduction creates enforce this ceiling.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ceilingAmount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ enum: RetentionReleaseStage })
  @ValidateIf((o: CreateContractorRetentionDto) => o.kind === RetentionKind.Release)
  @IsEnum(RetentionReleaseStage)
  releaseStage?: RetentionReleaseStage | null;

  @ApiPropertyOptional({
    description: 'BG document / instrument ref when stage is bg_replacement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  bgReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateContractorRetentionDto extends PartialType(
  OmitType(CreateContractorRetentionDto, [
    'projectId',
    'contractorId',
    'kind',
  ] as const),
) {}

export class RejectContractorRetentionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ListContractorRetentionQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  billId?: string;

  @ApiPropertyOptional({ enum: RetentionKind })
  @IsOptional()
  @IsEnum(RetentionKind)
  kind?: RetentionKind;

  @ApiPropertyOptional({ enum: RetentionStatus })
  @IsOptional()
  @IsEnum(RetentionStatus)
  status?: RetentionStatus;

  @ApiPropertyOptional({ enum: RetentionReleaseStage })
  @IsOptional()
  @IsEnum(RetentionReleaseStage)
  releaseStage?: RetentionReleaseStage;
}

export class RetentionRegisterQueryDto {
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
}
