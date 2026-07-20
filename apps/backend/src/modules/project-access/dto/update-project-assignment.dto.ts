import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectAccessStatus } from '../schemas/project-assignment.schema';

export class UpdateProjectAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  accessStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  accessEndDate?: string | null;

  @ApiPropertyOptional({ enum: ProjectAccessStatus })
  @IsOptional()
  @IsEnum(ProjectAccessStatus)
  status?: ProjectAccessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
