import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  EquipmentOwnership,
  EquipmentStatus,
} from '../schemas/equipment.schema';

export class CreateEquipmentDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;

  @ApiProperty({ example: 'EXC-01' })
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @ApiProperty({ enum: EquipmentOwnership })
  @IsEnum(EquipmentOwnership)
  ownership!: EquipmentOwnership;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}

export class ListEquipmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional({ enum: EquipmentOwnership })
  @IsOptional()
  @IsEnum(EquipmentOwnership)
  ownership?: EquipmentOwnership;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Search code or name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class CreateEquipmentAllocationDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty()
  @IsDateString()
  fromDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateEquipmentFuelLogDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateEquipmentMaintenanceLogDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateEquipmentBreakdownLogDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolvedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolution?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateEquipmentUtilizationDto {
  @ApiProperty()
  @IsMongoId()
  equipmentId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string | null;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursWorked!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursIdle!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class ListEquipmentUtilizationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  equipmentId?: string;
}
