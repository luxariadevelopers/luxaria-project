import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/**
 * Optional filters for `GET /vendors/:id/ledger`.
 * Mirrors accounting-reports query fields (partyId is forced from `:id`).
 */
export class VendorLedgerQueryDto {
  @ApiPropertyOptional({ description: 'Financial year ObjectId' })
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional({ description: 'Project ObjectId' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Period start (ISO date)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Period end (ISO date)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
