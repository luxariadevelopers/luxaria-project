import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from '../schemas/contractor-recovery.schema';

export class CreateContractorRecoveryDto {
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

  @ApiProperty({ enum: ContractorRecoveryType })
  @IsEnum(ContractorRecoveryType)
  type!: ContractorRecoveryType;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  billId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialReconciliationId?: string | null;
}

export class UpdateContractorRecoveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workOrderId?: string | null;

  @ApiPropertyOptional({ enum: ContractorRecoveryType })
  @IsOptional()
  @IsEnum(ContractorRecoveryType)
  type?: ContractorRecoveryType;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  billId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialReconciliationId?: string | null;
}

export class PostContractorRecoveryDto {
  @ApiPropertyOptional({
    description: 'Optional bill to attach when posting recovery',
  })
  @IsOptional()
  @IsMongoId()
  billId?: string | null;
}

export class ListContractorRecoveriesQueryDto extends PaginationQueryDto {
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
  billId?: string;

  @ApiPropertyOptional({ enum: ContractorRecoveryType })
  @IsOptional()
  @IsEnum(ContractorRecoveryType)
  type?: ContractorRecoveryType;

  @ApiPropertyOptional({ enum: ContractorRecoveryStatus })
  @IsOptional()
  @IsEnum(ContractorRecoveryStatus)
  status?: ContractorRecoveryStatus;
}
