import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDesignationDto {
  @ApiProperty({ example: 'SITE_ENGINEER' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: 'Site Engineer' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string | null;

  @ApiPropertyOptional({ example: 'SITE_ENGINEER' })
  @IsOptional()
  @IsString()
  defaultRoleCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  reportingLevel?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mobileEligible?: boolean;
}

export class UpdateDesignationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultRoleCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  reportingLevel?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mobileEligible?: boolean;
}
