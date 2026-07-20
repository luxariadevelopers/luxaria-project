import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  QualityInspectionResult,
  QualityInspectionStatus,
} from '../schemas/quality-inspection.schema';

export class QualityTestParameterDto {
  @ApiProperty({ example: 'Compressive strength' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: '53 MPa' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  expectedValue?: string | null;

  @ApiPropertyOptional({ example: '54.2 MPa' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  actualValue?: string | null;

  @ApiPropertyOptional({ example: 'MPa' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passed?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class QualityInspectionLineInputDto {
  @ApiProperty({ description: 'GRN line _id' })
  @IsMongoId()
  grnLineId!: string;

  @ApiProperty({ example: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  acceptedQuantity!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rejectedQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason?: string | null;
}

export class CreateQualityInspectionDto {
  @ApiProperty()
  @IsMongoId()
  grnId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  inspectionDate!: string;

  @ApiPropertyOptional({ type: [QualityTestParameterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityTestParameterDto)
  testParameters?: QualityTestParameterDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  samplePhotos?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testDocuments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string | null;
}

export class UpdateQualityInspectionDto extends PartialType(
  CreateQualityInspectionDto,
) {}

export class CompleteQualityInspectionDto {
  @ApiProperty({ enum: QualityInspectionResult })
  @IsEnum(QualityInspectionResult)
  result!: QualityInspectionResult;

  @ApiPropertyOptional({
    type: [QualityInspectionLineInputDto],
    description:
      'Required for Accepted / Partially Accepted / Rejected (not for Hold)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QualityInspectionLineInputDto)
  items?: QualityInspectionLineInputDto[];

  @ApiPropertyOptional({ type: [QualityTestParameterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityTestParameterDto)
  testParameters?: QualityTestParameterDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  samplePhotos?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testDocuments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string | null;
}

export class ListQualityInspectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  grnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @ApiPropertyOptional({ enum: QualityInspectionStatus })
  @IsOptional()
  @IsEnum(QualityInspectionStatus)
  status?: QualityInspectionStatus;

  @ApiPropertyOptional({ enum: QualityInspectionResult })
  @IsOptional()
  @IsEnum(QualityInspectionResult)
  result?: QualityInspectionResult;
}
