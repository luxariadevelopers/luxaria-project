import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SitePhotoLinkType } from '../schemas/site-photo.schema';

export class AttachSitePhotoDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty({ description: 'Existing StoredDocument id' })
  @IsMongoId()
  documentId!: string;

  @ApiProperty({ enum: SitePhotoLinkType })
  @IsEnum(SitePhotoLinkType)
  linkType!: SitePhotoLinkType;

  @ApiProperty()
  @IsMongoId()
  linkId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  capturedAt?: string | null;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;
}

export class ListSitePhotosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional({ enum: SitePhotoLinkType })
  @IsOptional()
  @IsEnum(SitePhotoLinkType)
  linkType?: SitePhotoLinkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  linkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  documentId?: string;
}
