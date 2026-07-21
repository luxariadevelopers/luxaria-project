import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from '../../company/dto/address.dto';
import { ProjectStage, ProjectStatus, ProjectType } from '../schemas/project.schema';
import { ProjectFinancialConfigDto } from './project-financial-config.dto';
import { ProjectSettingsDto } from './project-settings.dto';
import { ReraDetailsDto } from './rera-details.dto';

export class CreateProjectDto {
  @ApiProperty({ example: 'Luxaria Heights Phase 1' })
  @IsString()
  @IsNotEmpty()
  projectName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: ProjectType })
  @IsEnum(ProjectType)
  projectType!: ProjectType;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiPropertyOptional({ example: 13.0827 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ example: 80.2707 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 500,
    description: 'Geofence radius in meters for site-expense GPS warnings',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  siteRadiusMeters?: number | null;

  @ApiPropertyOptional({ description: 'Land area in sq.ft' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landArea?: number | null;

  @ApiPropertyOptional({ description: 'Built-up area in sq.ft' })
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

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string | null;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', default: 'Asia/Kolkata' })
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
  projectManager?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  assignedDirectors?: string[];

  @ApiPropertyOptional({ description: 'Bank account ObjectId (validated when bank module exists)' })
  @IsOptional()
  @IsMongoId()
  defaultBankAccount?: string | null;

  @ApiPropertyOptional({ example: 500000000 })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
