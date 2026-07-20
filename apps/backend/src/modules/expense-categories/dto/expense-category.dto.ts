import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ExpenseCategoryStatus } from '../schemas/expense-category.schema';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'LABOUR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'categoryCode must be alphanumeric (underscore/hyphen allowed)',
  })
  categoryCode!: string;

  @ApiProperty({ example: 'Labour' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'Parent category for hierarchy' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  parentCategoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Default expense ledger account (COA)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  defaultLedgerAccountId?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresBill?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Null clears the approval limit',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimit?: number | null;
}

export class UpdateExpenseCategoryDto extends PartialType(
  OmitType(CreateExpenseCategoryDto, ['categoryCode'] as const),
) {}

export class ConfigureEvidenceRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresBill?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null clears the approval limit',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimit?: number | null;
}

export class SetExpenseCategoryParentDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Null moves the category to root level',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  parentCategoryId?: string | null;
}

export class ListExpenseCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExpenseCategoryStatus })
  @IsOptional()
  @IsEnum(ExpenseCategoryStatus)
  status?: ExpenseCategoryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'When true, only root categories' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rootsOnly?: boolean;
}
