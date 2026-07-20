import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AccountingPeriodType } from '../accounting-period-closure.constants';

export class CreateAccountingPeriodDto {
  @ApiProperty({ enum: AccountingPeriodType })
  @IsEnum(AccountingPeriodType)
  periodType!: AccountingPeriodType;

  @ApiProperty()
  @IsMongoId()
  financialYearId!: string;

  @ApiPropertyOptional({
    description: 'Required when periodType is monthly (1–12)',
  })
  @ValidateIf((o: CreateAccountingPeriodDto) => o.periodType === AccountingPeriodType.Monthly)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Optional calendar year override for monthly periods',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListAccountingPeriodsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional({ enum: AccountingPeriodType })
  @IsOptional()
  @IsEnum(AccountingPeriodType)
  periodType?: AccountingPeriodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class RequestPeriodReopenDto {
  @ApiProperty({ example: 'Need to post late bank charge for July' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class ApprovePeriodReopenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  approvalNote?: string;
}

export class RejectPeriodReopenDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  rejectionReason!: string;
}
