import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApprovalStepConfigDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  stepNumber!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  specificUserIds?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @ApiPropertyOptional({
    example: 1_000_000,
    description: 'Omit or null for no upper bound',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumAmount?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresAll?: boolean;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  escalationHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  fallbackRole?: string | null;
}

export class UpsertApprovalWorkflowDto {
  @ApiProperty({ example: 'expenses' })
  @IsString()
  @IsNotEmpty()
  module!: string;

  @ApiProperty({ example: 'expense_claim' })
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, requester may approve their own request',
  })
  @IsOptional()
  @IsBoolean()
  allowSelfApprove?: boolean;

  @ApiProperty({ type: [ApprovalStepConfigDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepConfigDto)
  steps!: ApprovalStepConfigDto[];
}

export class CreateApprovalRequestDto {
  @ApiProperty({ example: 'expenses' })
  @IsString()
  @IsNotEmpty()
  module!: string;

  @ApiProperty({ example: 'expense_claim' })
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiProperty()
  @IsMongoId()
  entityId!: string;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, create as draft then immediately submit',
  })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class ApprovalActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class CancelApprovalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;
}
