import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  PettyCashExpenseCategory,
  PettyCashRequirementStatus,
} from '../schemas/petty-cash-requirement.schema';

export class RequirementItemDto {
  @ApiProperty({ enum: PettyCashExpenseCategory })
  @IsEnum(PettyCashExpenseCategory)
  expenseCategory!: PettyCashExpenseCategory;

  @ApiProperty({ example: 'Site transport for labour' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedAmount!: number;
}

export class CreatePettyCashRequirementDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  pettyCashAccountId!: string;

  @ApiProperty({
    example: '2026-07-13',
    description: 'Week start date (inclusive)',
  })
  @IsDateString()
  weekStartDate!: string;

  @ApiProperty({
    example: '2026-07-19',
    description: 'Week end date (inclusive)',
  })
  @IsDateString()
  weekEndDate!: string;

  @ApiProperty({ type: [RequirementItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequirementItemDto)
  requirementItems!: RequirementItemDto[];

  @ApiProperty({ example: 'Weekly site float for Tower A works' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justification!: string;
}

export class UpdatePettyCashRequirementDto {
  @ApiPropertyOptional({ type: [RequirementItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequirementItemDto)
  requirementItems?: RequirementItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  weekEndDate?: string;
}

export class ReviewActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class FinanceApproveDto extends ReviewActionDto {
  @ApiPropertyOptional({
    description:
      'Approved amount (may differ from requested). Defaults to requestedAmount.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedAmount?: number;
}

export class FundRequirementDto {
  @ApiPropertyOptional({
    description: 'Amount to fund (defaults to approvedAmount)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fundedAmount?: number;
}

export class ListPettyCashRequirementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  pettyCashAccountId?: string;

  @ApiPropertyOptional({ enum: PettyCashRequirementStatus })
  @IsOptional()
  @IsEnum(PettyCashRequirementStatus)
  status?: PettyCashRequirementStatus;
}
