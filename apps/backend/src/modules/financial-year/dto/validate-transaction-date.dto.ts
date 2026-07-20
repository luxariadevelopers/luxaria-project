import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class ValidateTransactionDateDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({
    description: 'When true, locked financial years reject the date (accounting postings)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? true : value === true || value === 'true')
  @IsBoolean()
  forPosting?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
