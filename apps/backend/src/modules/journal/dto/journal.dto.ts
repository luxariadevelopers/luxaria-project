import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  JournalFundingSource,
  JournalPartyType,
  JournalStatus,
} from '../schemas/journal-entry.schema';

export class JournalLineDto {
  @ApiProperty()
  @IsMongoId()
  accountId!: string;

  @ApiPropertyOptional({ example: 10000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  credit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  blockId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  costCentreId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional({ enum: JournalPartyType })
  @IsOptional()
  @IsEnum(JournalPartyType)
  partyType?: JournalPartyType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  partyId?: string | null;

  @ApiPropertyOptional({ enum: JournalFundingSource })
  @IsOptional()
  @IsEnum(JournalFundingSource)
  fundingSource?: JournalFundingSource | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CreateJournalDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  journalDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  sourceModule?: string | null;

  @ApiPropertyOptional({ example: 'manual_journal' })
  @IsOptional()
  @IsString()
  sourceEntityType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEntityId?: string | null;

  @ApiProperty({ example: 'Being transfer of funds to project bank' })
  @IsString()
  @IsNotEmpty()
  narration!: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];

  @ApiPropertyOptional({
    default: false,
    description: 'When true, create as draft then immediately post',
  })
  @IsOptional()
  @IsBoolean()
  post?: boolean;
}

export class UpdateJournalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  journalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiPropertyOptional({ type: [JournalLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines?: JournalLineDto[];
}

export class ReverseJournalDto {
  @ApiPropertyOptional({
    description: 'Reversal date (defaults to original journal date)',
  })
  @IsOptional()
  @IsDateString()
  journalDate?: string;

  @ApiPropertyOptional({
    description: 'Overrides narration on the reversing entry',
  })
  @IsOptional()
  @IsString()
  narration?: string;
}

export class CancelJournalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListJournalsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JournalStatus })
  @IsOptional()
  @IsEnum(JournalStatus)
  status?: JournalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceModule?: string;
}
