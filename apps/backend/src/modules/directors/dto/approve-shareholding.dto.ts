import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveShareholdingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalNote?: string | null;

  @ApiPropertyOptional({ description: 'Overrides proposal approvalReference if provided' })
  @IsOptional()
  @IsString()
  approvalReference?: string | null;
}
