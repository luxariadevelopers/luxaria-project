import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  PermissionOverrideEffect,
  PermissionOverrideStatus,
} from '../schemas/permission-override.schema';

export class CreatePermissionOverrideDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiProperty({ example: 'dpr.create' })
  @IsString()
  @MinLength(3)
  permission!: string;

  @ApiProperty({ enum: PermissionOverrideEffect })
  @IsEnum(PermissionOverrideEffect)
  effect!: PermissionOverrideEffect;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;
}

export class UpdatePermissionOverrideDto {
  @ApiPropertyOptional({ enum: PermissionOverrideStatus })
  @IsOptional()
  @IsEnum(PermissionOverrideStatus)
  status?: PermissionOverrideStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class ListPermissionOverridesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permission?: string;

  @ApiPropertyOptional({ enum: PermissionOverrideStatus })
  @IsOptional()
  @IsEnum(PermissionOverrideStatus)
  status?: PermissionOverrideStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
