import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  GstDirection,
  GstDocumentStatus,
  GstDocumentType,
  GstPartyType,
  GstSupplyType,
} from '../schemas/gst-document.schema';
import { GstReturnType } from '../schemas/gst-return.schema';

export class CreateGstDocumentDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty({ enum: GstDocumentType })
  @IsEnum(GstDocumentType)
  documentType!: GstDocumentType;

  @ApiProperty({ enum: GstDirection })
  @IsEnum(GstDirection)
  direction!: GstDirection;

  @ApiProperty({ enum: GstPartyType })
  @IsEnum(GstPartyType)
  partyType!: GstPartyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  partyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partyGstin?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  partyName!: string;

  @ApiProperty()
  @IsDateString()
  documentDate!: string;

  @ApiProperty({ enum: GstSupplyType })
  @IsEnum(GstSupplyType)
  supplyType!: GstSupplyType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxableValue!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cgst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sgst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  igst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cess?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  hsnSac?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeOfSupply?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceModule?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceEntityType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceEntityId?: string | null;

  @ApiPropertyOptional({ enum: GstDocumentStatus, default: GstDocumentStatus.Posted })
  @IsOptional()
  @IsEnum(GstDocumentStatus)
  status?: GstDocumentStatus;
}

export class SyncGstDocumentFromSourceDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sourceModule!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  sourceEntityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceEntityType?: string | null;
}

export class ListGstDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: GstDirection })
  @IsOptional()
  @IsEnum(GstDirection)
  direction?: GstDirection;

  @ApiPropertyOptional({ enum: GstDocumentStatus })
  @IsOptional()
  @IsEnum(GstDocumentStatus)
  status?: GstDocumentStatus;

  @ApiPropertyOptional({ enum: GstDocumentType })
  @IsOptional()
  @IsEnum(GstDocumentType)
  documentType?: GstDocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class GstRegisterQueryDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty({ enum: GstDirection })
  @IsEnum(GstDirection)
  direction!: GstDirection;

  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}

export class CreateGstReturnDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiProperty({ enum: GstReturnType })
  @IsEnum(GstReturnType)
  returnType!: GstReturnType;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class ListGstReturnsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ enum: GstReturnType })
  @IsOptional()
  @IsEnum(GstReturnType)
  returnType?: GstReturnType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear?: number;
}

export class FileGstReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  acknowledgementNumber?: string | null;
}
