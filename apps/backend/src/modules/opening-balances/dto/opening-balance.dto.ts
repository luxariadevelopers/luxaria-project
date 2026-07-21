import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { JournalPartyType } from '../../journal/schemas/journal-entry.schema';
import { OpeningBalancePackStatus } from '../schemas/opening-balance-pack.schema';

export class OpeningBalanceLineDto {
  @ApiProperty()
  @IsMongoId()
  accountId!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  credit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  costCentreId?: string | null;

  @ApiPropertyOptional({ enum: JournalPartyType })
  @IsOptional()
  @IsEnum(JournalPartyType)
  partyType?: JournalPartyType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  partyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class CreateOpeningBalancePackDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiProperty()
  @IsMongoId()
  financialYearId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty({ type: [OpeningBalanceLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => OpeningBalanceLineDto)
  lines!: OpeningBalanceLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateOpeningBalancePackDto extends PartialType(
  CreateOpeningBalancePackDto,
) {}

export class ListOpeningBalancePacksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: OpeningBalancePackStatus })
  @IsOptional()
  @IsEnum(OpeningBalancePackStatus)
  status?: OpeningBalancePackStatus;

  @ApiPropertyOptional({ description: 'Search pack number' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
