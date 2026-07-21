import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DrawingStatus } from '../schemas/drawing.schema';

const DRAWING_CREATE_STATUSES = [
  DrawingStatus.Draft,
  DrawingStatus.Issued,
] as const;

export class CreateDrawingDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty({ example: 'A-101' })
  @IsString()
  @MaxLength(80)
  drawingNumber!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: 'architectural' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string | null;

  @ApiProperty({ example: '0' })
  @IsString()
  @MaxLength(40)
  revision!: string;

  @ApiProperty({ description: 'Active document id for the drawing file' })
  @IsMongoId()
  documentId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  markupDocumentIds?: string[];

  @ApiPropertyOptional({ enum: DRAWING_CREATE_STATUSES })
  @IsOptional()
  @IsIn(DRAWING_CREATE_STATUSES)
  status?: DrawingStatus.Draft | DrawingStatus.Issued;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateDrawingRevisionDto {
  @ApiProperty({ example: 'A', description: 'New revision label' })
  @IsString()
  @MaxLength(40)
  revision!: string;

  @ApiProperty({ description: 'Active document id for the new revision file' })
  @IsMongoId()
  documentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  markupDocumentIds?: string[];

  @ApiPropertyOptional({ enum: DRAWING_CREATE_STATUSES })
  @IsOptional()
  @IsIn(DRAWING_CREATE_STATUSES)
  status?: DrawingStatus.Draft | DrawingStatus.Issued;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListDrawingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional({ enum: DrawingStatus })
  @IsOptional()
  @IsEnum(DrawingStatus)
  status?: DrawingStatus;

  @ApiPropertyOptional({ description: 'Filter by latest revision only' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isLatest?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  drawingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string;
}
