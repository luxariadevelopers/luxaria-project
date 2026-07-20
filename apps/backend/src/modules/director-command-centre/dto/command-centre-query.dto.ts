import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class CommandCentreQueryDto {
  /** As-of / reporting date (defaults to today). Also used for “due today”. */
  @ApiPropertyOptional({
    description: 'Reporting date (ISO). Defaults to today (UTC calendar day).',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter to a single project' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter to projects where this director is a participant',
  })
  @IsOptional()
  @IsMongoId()
  directorId?: string;

  @ApiPropertyOptional({
    description: 'Financial year id — constrains transactional date ranges',
  })
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;
}
