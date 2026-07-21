import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SiteStatus, SiteType } from '../schemas/site.schema';

export class CreateSiteDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: 'A1' })
  @IsString()
  @MinLength(1)
  siteCode!: string;

  @ApiProperty({ example: 'Tower A Block 1' })
  @IsString()
  @MinLength(1)
  siteName!: string;

  @ApiPropertyOptional({ enum: SiteType })
  @IsOptional()
  @IsEnum(SiteType)
  type?: SiteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseRef?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geo?: Record<string, unknown> | null;
}

export class UpdateSiteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiPropertyOptional({ enum: SiteType })
  @IsOptional()
  @IsEnum(SiteType)
  type?: SiteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ enum: SiteStatus })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseRef?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geo?: Record<string, unknown> | null;
}

export class ListSitesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: SiteStatus })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}
