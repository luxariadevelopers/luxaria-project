import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { PAN_REGEX } from '../../company/company.validation';
import { DIN_REGEX } from '../shareholding.validation';
import { DirectorStatus } from '../schemas/director.schema';

export class CreateDirectorDto {
  @ApiProperty({ example: 'Director Five' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    description: 'Linked system user — required for every director',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ example: '12345678' })
  @ValidateIf((o: CreateDirectorDto) => !!o.din)
  @IsOptional()
  @IsString()
  @Matches(DIN_REGEX, { message: 'din must be an 8-digit number' })
  din?: string | null;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @ValidateIf((o: CreateDirectorDto) => !!o.pan)
  @IsOptional()
  @IsString()
  @Matches(PAN_REGEX, { message: 'pan must be a valid PAN' })
  pan?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateDirectorDto) => !!o.email)
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
