import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { SiteAssignmentStatus } from '../schemas/site-assignment.schema';

export class CreateSiteAssignmentDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  siteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  employeeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectAssignmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleInSite?: string | null;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ListSiteAssignmentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional({ enum: SiteAssignmentStatus })
  @IsOptional()
  @IsEnum(SiteAssignmentStatus)
  status?: SiteAssignmentStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}

export class UpdateSiteAssignmentStatusDto {
  @ApiPropertyOptional({ enum: SiteAssignmentStatus })
  @IsOptional()
  @IsEnum(SiteAssignmentStatus)
  status?: SiteAssignmentStatus;
}
