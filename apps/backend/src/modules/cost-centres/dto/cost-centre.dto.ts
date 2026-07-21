import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  CostCentreKind,
  CostCentreStatus,
} from '../schemas/cost-centre.schema';

export class CreateCostCentreDto {
  @ApiProperty({ example: 'CC-001', description: 'Unique cost centre code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must be alphanumeric (underscore/hyphen allowed)',
  })
  code!: string;

  @ApiProperty({ example: 'Tower A — Civil' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: CostCentreKind })
  @IsEnum(CostCentreKind)
  kind!: CostCentreKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;

  @ApiPropertyOptional({ description: 'Optional project scope' })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({ description: 'Parent cost / profit centre' })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateCostCentreDto extends PartialType(
  OmitType(CreateCostCentreDto, ['code'] as const),
) {}

export class ListCostCentresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: CostCentreKind })
  @IsOptional()
  @IsEnum(CostCentreKind)
  kind?: CostCentreKind;

  @ApiPropertyOptional({ enum: CostCentreStatus })
  @IsOptional()
  @IsEnum(CostCentreStatus)
  status?: CostCentreStatus;

  @ApiPropertyOptional({ description: 'Search code or name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
