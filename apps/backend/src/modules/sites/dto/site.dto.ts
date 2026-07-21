import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  SiteStatus,
  SiteType,
  WarehouseKind,
} from '../schemas/site.schema';

export class CreateSiteDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Parent site in the project structure' })
  @IsOptional()
  @IsMongoId()
  parentSiteId?: string | null;

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

  @ApiPropertyOptional({ enum: WarehouseKind })
  @ValidateIf((o: CreateSiteDto) => o.type === SiteType.Warehouse)
  @IsOptional()
  @IsEnum(WarehouseKind)
  warehouseKind?: WarehouseKind | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string | null;

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

export class CreateStructureNodeDto {
  @ApiPropertyOptional({ description: 'Parent site in the project structure' })
  @IsOptional()
  @IsMongoId()
  parentSiteId?: string | null;

  @ApiProperty({ enum: SiteType })
  @IsEnum(SiteType)
  type!: SiteType;

  @ApiProperty({ example: 'PH1' })
  @IsString()
  @MinLength(1)
  siteCode!: string;

  @ApiProperty({ example: 'Phase 1' })
  @IsString()
  @MinLength(1)
  siteName!: string;

  @ApiPropertyOptional({ enum: WarehouseKind })
  @IsOptional()
  @IsEnum(WarehouseKind)
  warehouseKind?: WarehouseKind | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteManagerUserId?: string | null;
}

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-MAIN' })
  @IsString()
  @MinLength(1)
  siteCode!: string;

  @ApiProperty({ example: 'Main Store' })
  @IsString()
  @MinLength(1)
  siteName!: string;

  @ApiProperty({ enum: WarehouseKind })
  @IsEnum(WarehouseKind)
  warehouseKind!: WarehouseKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentSiteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;
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
  @IsMongoId()
  parentSiteId?: string | null;

  @ApiPropertyOptional({ enum: WarehouseKind })
  @IsOptional()
  @IsEnum(WarehouseKind)
  warehouseKind?: WarehouseKind | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string | null;

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

  @ApiPropertyOptional({ enum: SiteType })
  @IsOptional()
  @IsEnum(SiteType)
  type?: SiteType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}
