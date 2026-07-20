import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateProjectAssignmentDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Required unless globalAccess is true',
  })
  @ValidateIf((o: CreateProjectAssignmentDto) => !o.globalAccess)
  @IsMongoId()
  projectId?: string | null;

  @ApiPropertyOptional({
    description:
      'All-project access for the window (e.g. Directors). Granted only via this flag — not by role title.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  globalAccess?: boolean;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  accessStartDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Omit for open-ended access' })
  @IsOptional()
  @IsDateString()
  accessEndDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
