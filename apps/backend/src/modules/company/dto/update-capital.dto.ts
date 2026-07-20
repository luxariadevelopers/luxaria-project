import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CompanyCapitalType } from '../schemas/company-capital-history.schema';

export class UpdateCapitalDto {
  @ApiProperty({ enum: CompanyCapitalType })
  @IsEnum(CompanyCapitalType)
  capitalType!: CompanyCapitalType;

  @ApiProperty({ example: 10000000, description: 'New capital amount in INR' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  newAmount!: number;

  @ApiPropertyOptional({ description: 'Defaults to now' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeReason?: string | null;

  @ApiPropertyOptional({ description: 'Board resolution / ROC filing reference' })
  @IsOptional()
  @IsString()
  reference?: string | null;
}
