import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockVendorDto {
  @ApiPropertyOptional({ example: 'Repeated quality failures' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
