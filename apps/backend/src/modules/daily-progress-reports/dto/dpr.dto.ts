import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  DprIssueSeverity,
  DprStatus,
  DprWeather,
} from '../schemas/daily-progress-report.schema';

export class DprStaffPresentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  present?: boolean;
}

export class DprBoqQuantityDto {
  @ApiProperty()
  @IsMongoId()
  boqItemId!: string;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityCompleted!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class DprMaterialLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  materialName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;
}

export class DprEquipmentUsedDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class DprDelayDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursLost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class DprIssueDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ enum: DprIssueSeverity })
  @IsOptional()
  @IsEnum(DprIssueSeverity)
  severity?: DprIssueSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionTaken?: string | null;
}

export class DprDecisionRequiredDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  owner?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class CreateDailyProgressReportDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  reportDate!: string;

  @ApiProperty({ enum: DprWeather })
  @IsEnum(DprWeather)
  weather!: DprWeather;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  weatherNotes?: string | null;

  @ApiPropertyOptional({ type: [DprStaffPresentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprStaffPresentDto)
  staffPresent?: DprStaffPresentDto[];

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skilledLabourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unskilledLabourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  workPerformed?: string | null;

  @ApiPropertyOptional({ type: [DprBoqQuantityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprBoqQuantityDto)
  boqQuantities?: DprBoqQuantityDto[];

  @ApiPropertyOptional({ type: [DprMaterialLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprMaterialLineDto)
  materialsReceived?: DprMaterialLineDto[];

  @ApiPropertyOptional({ type: [DprMaterialLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprMaterialLineDto)
  materialsIssued?: DprMaterialLineDto[];

  @ApiPropertyOptional({ type: [DprEquipmentUsedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprEquipmentUsedDto)
  equipmentUsed?: DprEquipmentUsedDto[];

  @ApiPropertyOptional({ type: [DprDelayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprDelayDto)
  delays?: DprDelayDto[];

  @ApiPropertyOptional({ type: [DprIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprIssueDto)
  safetyIssues?: DprIssueDto[];

  @ApiPropertyOptional({ type: [DprIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprIssueDto)
  qualityIssues?: DprIssueDto[];

  @ApiPropertyOptional({ type: [DprDecisionRequiredDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprDecisionRequiredDto)
  decisionsRequired?: DprDecisionRequiredDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  tomorrowPlan?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  videoDocumentIds?: string[];

  @ApiPropertyOptional({ example: 12500.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  siteCashBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteCashAccountId?: string | null;

  @ApiPropertyOptional({
    description: 'Device id for offline mobile submissions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientDeviceId?: string | null;

  @ApiPropertyOptional({
    description: 'Client clock when offline draft was captured',
  })
  @IsOptional()
  @IsDateString()
  offlineCapturedAt?: string | null;

  @ApiPropertyOptional({
    description: 'When true, create as draft then immediately submit',
  })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @ApiPropertyOptional({
    description:
      'Offline sync map — photo_0 / video_0 document IDs merge into media arrays',
  })
  @IsOptional()
  @IsObject()
  attachments?: Record<string, string>;
}

export class UpdateDailyProgressReportDto {
  @ApiPropertyOptional({ enum: DprWeather })
  @IsOptional()
  @IsEnum(DprWeather)
  weather?: DprWeather;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  weatherNotes?: string | null;

  @ApiPropertyOptional({ type: [DprStaffPresentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprStaffPresentDto)
  staffPresent?: DprStaffPresentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skilledLabourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unskilledLabourCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  workPerformed?: string | null;

  @ApiPropertyOptional({ type: [DprBoqQuantityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprBoqQuantityDto)
  boqQuantities?: DprBoqQuantityDto[];

  @ApiPropertyOptional({ type: [DprMaterialLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprMaterialLineDto)
  materialsReceived?: DprMaterialLineDto[];

  @ApiPropertyOptional({ type: [DprMaterialLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprMaterialLineDto)
  materialsIssued?: DprMaterialLineDto[];

  @ApiPropertyOptional({ type: [DprEquipmentUsedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprEquipmentUsedDto)
  equipmentUsed?: DprEquipmentUsedDto[];

  @ApiPropertyOptional({ type: [DprDelayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprDelayDto)
  delays?: DprDelayDto[];

  @ApiPropertyOptional({ type: [DprIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprIssueDto)
  safetyIssues?: DprIssueDto[];

  @ApiPropertyOptional({ type: [DprIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprIssueDto)
  qualityIssues?: DprIssueDto[];

  @ApiPropertyOptional({ type: [DprDecisionRequiredDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DprDecisionRequiredDto)
  decisionsRequired?: DprDecisionRequiredDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  tomorrowPlan?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  videoDocumentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  siteCashBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteCashAccountId?: string | null;
}

export class ReviewDailyProgressReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string | null;
}

export class ReopenDailyProgressReportDto {
  @ApiProperty({ example: 'Incorrect labour count' })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ListDailyProgressReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: DprStatus })
  @IsOptional()
  @IsEnum(DprStatus)
  status?: DprStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
