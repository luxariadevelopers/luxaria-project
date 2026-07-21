import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UnitHandoverStatus } from '../schemas/unit-handover.schema';

export class MeterReadingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  utility!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reading!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string | null;
}

export class WarrantyDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  filePath!: string;
}

export class AssetRegisterItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serial?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  condition?: string | null;
}

export class HandoverPhotoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  filePath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  takenAt?: string | null;
}

export class CreateUnitHandoverDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiPropertyOptional({ type: [MeterReadingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeterReadingDto)
  meterReadings?: MeterReadingDto[];

  @ApiPropertyOptional({ type: [WarrantyDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarrantyDocumentDto)
  warrantyDocuments?: WarrantyDocumentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  maintenanceNotes?: string | null;

  @ApiPropertyOptional({ type: [AssetRegisterItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetRegisterItemDto)
  assetRegister?: AssetRegisterItemDto[];

  @ApiPropertyOptional({ type: [HandoverPhotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverPhotoDto)
  photos?: HandoverPhotoDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateUnitHandoverDto extends PartialType(
  OmitType(CreateUnitHandoverDto, [
    'projectId',
    'bookingId',
    'customerId',
    'unitId',
  ] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  keysHandedOver?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerAcknowledged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  acknowledgedByName?: string | null;
}

export class ScheduleUnitHandoverDto {
  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;
}

export class AddSnagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CloseSnagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListUnitHandoverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string;

  @ApiPropertyOptional({ enum: UnitHandoverStatus })
  @IsOptional()
  @IsEnum(UnitHandoverStatus)
  status?: UnitHandoverStatus;
}
