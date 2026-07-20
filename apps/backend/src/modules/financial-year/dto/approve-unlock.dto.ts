import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveUnlockDto {
  @ApiPropertyOptional({ example: 'Approved for corrective JV posting' })
  @IsOptional()
  @IsString()
  approvalNote?: string | null;
}
