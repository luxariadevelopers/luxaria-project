import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { PAN_REGEX } from '../../company/company.validation';
import { DIN_REGEX } from '../shareholding.validation';
import { DirectorStatus } from '../schemas/director.schema';

export class UpdateDirectorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateDirectorDto) => o.din !== null && o.din !== undefined && o.din !== '')
  @IsOptional()
  @IsString()
  @Matches(DIN_REGEX, { message: 'din must be an 8-digit number' })
  din?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateDirectorDto) => o.pan !== null && o.pan !== undefined && o.pan !== '')
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: UpdateDirectorDto) => o.email !== null && o.email !== undefined && o.email !== '',
  )
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appointmentDate?: string | null;

  @ApiPropertyOptional({ enum: DirectorStatus })
  @IsOptional()
  @IsEnum(DirectorStatus)
  status?: DirectorStatus;
}
