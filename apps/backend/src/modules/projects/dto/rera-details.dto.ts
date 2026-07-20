import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReraDetailsDto {
  @ApiPropertyOptional({ example: 'TN/Building/0123/2026' })
  @IsOptional()
  @IsString()
  reraNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @ApiPropertyOptional({ example: 'TNRERA' })
  @IsOptional()
  @IsString()
  authority?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
