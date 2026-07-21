import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BudgetStatus } from '../schemas/budget.schema';

export class BudgetLineDto {
  @ApiProperty()
  @IsMongoId()
  accountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  costCentreId?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number | null;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsMongoId()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty()
  @IsMongoId()
  financialYearId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional({ type: [BudgetLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines?: BudgetLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateBudgetDto extends PartialType(
  OmitType(CreateBudgetDto, ['companyId'] as const),
) {}

export class RejectBudgetDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ReviseBudgetDto extends PartialType(
  OmitType(CreateBudgetDto, ['companyId', 'financialYearId', 'projectId'] as const),
) {}

export class ListBudgetsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional({ enum: BudgetStatus })
  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  rootBudgetId?: string;
}
