import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  PunchItemStatus,
  SiteQualityStatus,
} from '../schemas/site-quality.schema';

export class PunchItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({ enum: PunchItemStatus })
  @IsOptional()
  @IsEnum(PunchItemStatus)
  status?: PunchItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class CreateSiteQualityDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  findings?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({ type: [PunchItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchItemDto)
  punchItems?: PunchItemDto[];
}

export class UpdateSiteQualityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  findings?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({ type: [PunchItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchItemDto)
  punchItems?: PunchItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rectificationNotes?: string | null;
}

export class RaiseNcrDto {
  @ApiPropertyOptional({
    description: 'Optional findings when raising NCR from inspection',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  findings?: string | null;
}

export class SetPunchListDto {
  @ApiProperty({ type: [PunchItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchItemDto)
  punchItems!: PunchItemDto[];
}

export class RecordRectificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  rectificationNotes!: string;
}

export class ListSiteQualityQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: SiteQualityStatus })
  @IsOptional()
  @IsEnum(SiteQualityStatus)
  status?: SiteQualityStatus;
}
