import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  WarehouseLocationLevel,
  WarehouseLocationStatus,
} from '../schemas/warehouse-location.schema';

export class CreateWarehouseLocationDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ description: 'Warehouse site id (SiteType.warehouse)' })
  @IsMongoId()
  warehouseId!: string;

  @ApiPropertyOptional({
    description: 'Parent location id (required for rack/bin)',
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiProperty({ enum: WarehouseLocationLevel })
  @IsEnum(WarehouseLocationLevel)
  level!: WarehouseLocationLevel;

  @ApiProperty({ example: 'Z01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Receiving Zone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number | null;

  @ApiPropertyOptional({ enum: WarehouseLocationStatus })
  @IsOptional()
  @IsEnum(WarehouseLocationStatus)
  status?: WarehouseLocationStatus;
}

export class UpdateWarehouseLocationDto extends PartialType(
  CreateWarehouseLocationDto,
) {
  @ApiPropertyOptional({ enum: WarehouseLocationStatus })
  @IsOptional()
  @IsEnum(WarehouseLocationStatus)
  status?: WarehouseLocationStatus;
}

export class ListWarehouseLocationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({ enum: WarehouseLocationLevel })
  @IsOptional()
  @IsEnum(WarehouseLocationLevel)
  level?: WarehouseLocationLevel;

  @ApiPropertyOptional({ enum: WarehouseLocationStatus })
  @IsOptional()
  @IsEnum(WarehouseLocationStatus)
  status?: WarehouseLocationStatus;
}
