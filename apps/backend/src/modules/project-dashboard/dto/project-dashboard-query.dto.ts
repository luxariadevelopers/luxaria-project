import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ProjectDashboardQueryDto {
  /** As-of reporting date (defaults to today). Used for balances and “as of” ops. */
  @ApiPropertyOptional({
    description: 'Reporting date (ISO). Defaults to today (UTC calendar day).',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  /** Inclusive start for transactional tiles (collections, costs by date). */
  @ApiPropertyOptional({ description: 'Range start (ISO date)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive end for transactional tiles. */
  @ApiPropertyOptional({ description: 'Range end (ISO date)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
