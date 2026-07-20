import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { CIN_REGEX, GSTIN_REGEX, PAN_REGEX, TAN_REGEX } from '../company.validation';

export class UpdateStatutoryDto {
  @ApiPropertyOptional({ example: 'U45200TN2020PTC123456' })
  @ValidateIf((o: UpdateStatutoryDto) => o.cin !== null && o.cin !== undefined && o.cin !== '')
  @IsOptional()
  @IsString()
  @Matches(CIN_REGEX, { message: 'cin must be a valid CIN' })
  cin?: string | null;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: UpdateStatutoryDto) => o.pan !== null && o.pan !== undefined && o.pan !== '')
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional({ example: 'CHEL12345A' })
  @ValidateIf((o: UpdateStatutoryDto) => o.tan !== null && o.tan !== undefined && o.tan !== '')
  @IsOptional()
  @IsString()
  @Matches(TAN_REGEX, { message: 'tan must be a valid TAN' })
  tan?: string | null;

  @ApiPropertyOptional({ example: '33ABCDE1234F1Z5' })
  @ValidateIf(
    (o: UpdateStatutoryDto) => o.gstin !== null && o.gstin !== undefined && o.gstin !== '',
  )
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: 'gstin must be a valid GSTIN' })
  gstin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;
}
