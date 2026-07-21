import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProjectFinancialConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  costCentreCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profitCentreCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultGstPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCurrency?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxNotes?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  budgetCategories?: string[];
}
