import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContractorMaterialReconciliationStatus } from '../schemas/contractor-material-reconciliation.schema';

export class MaterialReconciliationPeriodDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  to!: string;
}

export class CreateMaterialReconciliationDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  contractorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workOrderId?: string | null;

  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ type: MaterialReconciliationPeriodDto })
  @ValidateNested()
  @Type(() => MaterialReconciliationPeriodDto)
  period!: MaterialReconciliationPeriodDto;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  issuedQuantity!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  theoreticalConsumption!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  approvedWastage!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  returnedQuantity!: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

export class UpdateMaterialReconciliationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workOrderId?: string | null;

  @ApiPropertyOptional({ type: MaterialReconciliationPeriodDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialReconciliationPeriodDto)
  period?: MaterialReconciliationPeriodDto;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  issuedQuantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  theoreticalConsumption?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedWastage?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnedQuantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

export class PostMaterialReconciliationToBillDto {
  @ApiProperty()
  @IsMongoId()
  billId!: string;
}

export class ListMaterialReconciliationsQueryDto extends PaginationQueryDto {
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
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workOrderId?: string;

  @ApiPropertyOptional({ enum: ContractorMaterialReconciliationStatus })
  @IsOptional()
  @IsEnum(ContractorMaterialReconciliationStatus)
  status?: ContractorMaterialReconciliationStatus;
}
