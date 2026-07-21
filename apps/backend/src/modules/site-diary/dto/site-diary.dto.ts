import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SiteDiaryEntryType } from '../schemas/site-diary-entry.schema';

export class SiteDiaryVisitorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organization?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  purpose?: string | null;
}

export class CreateSiteDiaryEntryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string | null;

  @ApiProperty({ example: '2026-07-21' })
  @IsDateString()
  entryDate!: string;

  @ApiProperty({ enum: SiteDiaryEntryType })
  @IsEnum(SiteDiaryEntryType)
  entryType!: SiteDiaryEntryType;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ type: [SiteDiaryVisitorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteDiaryVisitorDto)
  visitors?: SiteDiaryVisitorDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];
}

export class UpdateSiteDiaryEntryDto extends PartialType(
  OmitType(CreateSiteDiaryEntryDto, ['projectId'] as const),
) {}

export class ListSiteDiaryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive range start (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive range end (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: SiteDiaryEntryType })
  @IsOptional()
  @IsEnum(SiteDiaryEntryType)
  entryType?: SiteDiaryEntryType;
}
