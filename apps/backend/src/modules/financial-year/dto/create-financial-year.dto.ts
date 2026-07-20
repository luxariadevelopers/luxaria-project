import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFinancialYearDto {
  @ApiProperty({ example: 'FY 2026-27' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-03-31' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Company id; defaults to primary company when omitted' })
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;

  @ApiPropertyOptional({
    description: 'Set as the current financial year on create',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  setAsCurrent?: boolean;
}
