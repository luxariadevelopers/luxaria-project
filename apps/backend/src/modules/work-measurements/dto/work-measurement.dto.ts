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
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WorkMeasurementStatus } from '../schemas/work-measurement.schema';

export class CreateWorkMeasurementDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty()
  @IsMongoId()
  boqItemId!: string;

  @ApiProperty({ example: 'Block A / Floor 2 / Grid C-D' })
  @IsString()
  @MaxLength(240)
  location!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  measurementDate!: string;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentQuantity!: number;

  @ApiPropertyOptional({
    description: 'Defaults to the authenticated user',
  })
  @IsOptional()
  @IsMongoId()
  measuredBy?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({
    description: 'Offline sync map; keys photo_0, photos, photoDocumentIds',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  attachments?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  drawingReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'When true, create and submit in one step',
  })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class UpdateWorkMeasurementDto extends PartialType(
  CreateWorkMeasurementDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;
}

export class ListWorkMeasurementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional({ enum: WorkMeasurementStatus })
  @IsOptional()
  @IsEnum(WorkMeasurementStatus)
  status?: WorkMeasurementStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class RejectWorkMeasurementDto {
  @ApiProperty({ example: 'Quantity not supported by site evidence' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class VerifyWorkMeasurementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
