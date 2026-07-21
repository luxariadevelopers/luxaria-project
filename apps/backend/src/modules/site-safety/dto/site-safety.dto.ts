import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
  SiteSafetySeverity,
  SiteSafetyStatus,
  SiteSafetyType,
} from '../schemas/site-safety.schema';

export class PpeChecklistItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  item!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  compliant?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class SafetyAttendeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string | null;
}

export class CreateSiteSafetyDto {
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

  @ApiProperty({ enum: SiteSafetyType })
  @IsEnum(SiteSafetyType)
  type!: SiteSafetyType;

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

  @ApiPropertyOptional({ enum: SiteSafetySeverity })
  @IsOptional()
  @IsEnum(SiteSafetySeverity)
  severity?: SiteSafetySeverity;

  @ApiPropertyOptional({ type: [PpeChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PpeChecklistItemDto)
  ppeChecklist?: PpeChecklistItemDto[] | null;

  @ApiPropertyOptional({ type: [SafetyAttendeeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyAttendeeDto)
  attendees?: SafetyAttendeeDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];
}

export class UpdateSiteSafetyDto {
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: SiteSafetySeverity })
  @IsOptional()
  @IsEnum(SiteSafetySeverity)
  severity?: SiteSafetySeverity;

  @ApiPropertyOptional({ type: [PpeChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PpeChecklistItemDto)
  ppeChecklist?: PpeChecklistItemDto[] | null;

  @ApiPropertyOptional({ type: [SafetyAttendeeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyAttendeeDto)
  attendees?: SafetyAttendeeDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  investigationNotes?: string | null;
}

export class InvestigateSiteSafetyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  investigationNotes?: string | null;
}

export class ListSiteSafetyQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: SiteSafetyType })
  @IsOptional()
  @IsEnum(SiteSafetyType)
  type?: SiteSafetyType;

  @ApiPropertyOptional({ enum: SiteSafetyStatus })
  @IsOptional()
  @IsEnum(SiteSafetyStatus)
  status?: SiteSafetyStatus;

  @ApiPropertyOptional({ enum: SiteSafetySeverity })
  @IsOptional()
  @IsEnum(SiteSafetySeverity)
  severity?: SiteSafetySeverity;
}
