import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BoqUnit } from '../../boq/schemas/boq.schema';
import { MeasurementBookStatus } from '../schemas/measurement-book-entry.schema';

export class MbSiteLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  phaseId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  blockId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  towerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  floorId?: string | null;

  @ApiPropertyOptional({ example: 'Grid C-D / Bay 3' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationLabel?: string | null;
}

export class CreateMeasurementBookEntryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiProperty()
  @IsMongoId()
  boqItemId!: string;

  @ApiPropertyOptional({
    description: 'Optional Work Order ObjectId (W4 — soft link)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  workOrderId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional source work-measurement sheet',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  workMeasurementId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  dprId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsMongoId()
  drawingId?: string | null;

  @ApiProperty({ type: MbSiteLocationDto })
  @ValidateNested()
  @Type(() => MbSiteLocationDto)
  location!: MbSiteLocationDto;

  @ApiPropertyOptional({ description: 'Length (L)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number | null;

  @ApiPropertyOptional({ description: 'Breadth (B)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  breadth?: number | null;

  @ApiPropertyOptional({ description: 'Height / depth (H)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number | null;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfUnits?: number;

  @ApiPropertyOptional({
    description: 'Formula expression label (not evaluated server-side)',
    example: 'L*B*H',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  formula?: string | null;

  @ApiPropertyOptional({
    description: 'Pre-computed formula quantity (wins over L×B×H×nos)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  formulaQuantity?: number | null;

  @ApiPropertyOptional({
    description: 'Explicit quantity override when no dims / formula',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number | null;

  @ApiPropertyOptional({
    enum: BoqUnit,
    description: 'Defaults from BOQ item when omitted',
  })
  @IsOptional()
  @IsEnum(BoqUnit)
  unit?: BoqUnit;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  periodFrom!: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  periodTo!: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  measurementDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workDescription?: string | null;

  @ApiPropertyOptional({ example: 'MB-12 / Sheet 3' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sheetReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];

  @ApiPropertyOptional({
    description: 'Defaults to the authenticated user',
  })
  @IsOptional()
  @IsMongoId()
  measuredBy?: string;
}

export class UpdateMeasurementBookEntryDto extends PartialType(
  CreateMeasurementBookEntryDto,
) {}

export class ListMeasurementBookQueryDto extends PaginationQueryDto {
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
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workMeasurementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string;

  @ApiPropertyOptional({ enum: MeasurementBookStatus })
  @IsOptional()
  @IsEnum(MeasurementBookStatus)
  status?: MeasurementBookStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by period overlap start' })
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by period overlap end' })
  @IsOptional()
  @IsDateString()
  periodTo?: string;
}

export class RejectMeasurementBookDto {
  @ApiProperty({ example: 'Dimensions do not match site evidence' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class ReviseMeasurementBookDto {
  @ApiProperty({
    example: 'Correct breadth after re-measure on site',
  })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ description: 'Length (L)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  breadth?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfUnits?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  formula?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  formulaQuantity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];
}
