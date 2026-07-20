import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyCustomerKycDto {
  @ApiProperty({
    description: 'true = verified, false = rejected',
    example: true,
  })
  @IsBoolean()
  verified!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  notes?: string | null;
}
