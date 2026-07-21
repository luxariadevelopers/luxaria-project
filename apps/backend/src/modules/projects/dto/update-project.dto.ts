import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from '../../company/dto/address.dto';
import { ProjectStage, ProjectType } from '../schemas/project.schema';
import { ProjectFinancialConfigDto } from './project-financial-config.dto';
import { ProjectSettingsDto } from './project-settings.dto';
import { ReraDetailsDto } from './rera-details.dto';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ProjectType })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({
    description: 'Geofence radius in meters for site-expense GPS warnings',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  siteRadiusMeters?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landArea?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  builtUpArea?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfBlocks?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfUnits?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string | null;

  @ApiPropertyOptional({ type: ProjectSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectSettingsDto)
  settings?: ProjectSettingsDto;

  @ApiPropertyOptional({ type: ProjectFinancialConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectFinancialConfigDto)
  financialConfig?: ProjectFinancialConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  defaultBankAccount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedBudget?: number | null;

  @ApiPropertyOptional({ enum: ProjectStage })
  @IsOptional()
  @IsEnum(ProjectStage)
  projectStage?: ProjectStage;

  @ApiPropertyOptional({ type: ReraDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReraDetailsDto)
  reraDetails?: ReraDetailsDto;
}
