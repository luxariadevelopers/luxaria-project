import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockContractorDto {
  @ApiPropertyOptional({ example: 'Safety violations on site' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
