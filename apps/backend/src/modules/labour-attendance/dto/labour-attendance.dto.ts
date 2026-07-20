import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  LabourAttendanceEntryMode,
  LabourAttendanceStatus,
} from '../schemas/labour-attendance.schema';

export class LabourAttendanceWorkerDto {
  @ApiPropertyOptional({ example: 'W-001' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  workerCode?: string | null;

  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @MaxLength(120)
  workerName!: string;

  @ApiPropertyOptional({ example: '2026-07-20T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkIn?: string | null;

  @ApiPropertyOptional({ example: '2026-07-20T17:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOut?: string | null;

  @ApiPropertyOptional({ example: 1.5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class LabourAttendanceLineDto {
  @ApiProperty()
  @IsMongoId()
  labourCategoryId!: string;

  @ApiProperty({ enum: LabourAttendanceEntryMode })
  @IsEnum(LabourAttendanceEntryMode)
  entryMode!: LabourAttendanceEntryMode;

  @ApiPropertyOptional({
    description: 'Required for group mode; ignored for individual (derived)',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  workerCount?: number;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @ApiPropertyOptional({ type: [LabourAttendanceWorkerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabourAttendanceWorkerDto)
  workers?: LabourAttendanceWorkerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}

export class CreateLabourAttendanceDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  attendanceDate!: string;

  @ApiPropertyOptional({ example: 'Block A podium' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workLocation?: string | null;

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

  @ApiProperty({ type: [LabourAttendanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabourAttendanceLineDto)
  lines!: LabourAttendanceLineDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  groupPhotoDocumentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string | null;

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
      'Offline sync map — group_photo_0 document IDs merge into groupPhotoDocumentIds',
  })
  @IsOptional()
  @IsObject()
  attachments?: Record<string, string>;
}

export class UpdateLabourAttendanceDto extends PartialType(
  CreateLabourAttendanceDto,
) {
  @ApiPropertyOptional({ type: [LabourAttendanceLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabourAttendanceLineDto)
  lines?: LabourAttendanceLineDto[];
}

export class ConfirmLabourAttendanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  confirmationNotes?: string | null;
}

export class ListLabourAttendanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  attendanceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: LabourAttendanceStatus })
  @IsOptional()
  @IsEnum(LabourAttendanceStatus)
  status?: LabourAttendanceStatus;
}

export class DailyAttendanceReportQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  attendanceDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;
}
