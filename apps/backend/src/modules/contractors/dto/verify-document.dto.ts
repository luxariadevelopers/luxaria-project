import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class VerifyContractorDocumentDto {
  @ApiProperty({ description: 'true = verified, false = rejected' })
  @IsBoolean()
  verified!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Optional expiry captured at verification time',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
