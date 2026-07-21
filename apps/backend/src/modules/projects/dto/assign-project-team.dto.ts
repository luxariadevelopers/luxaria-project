import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { ProjectTeamRole } from '../../project-access/schemas/project-assignment.schema';

export class AssignProjectTeamDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiProperty({ enum: ProjectTeamRole })
  @IsEnum(ProjectTeamRole)
  teamRole!: ProjectTeamRole;

  @ApiPropertyOptional({
    description: 'Optional site scope — creates/updates a SiteAssignment',
  })
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  accessStartDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  accessEndDate?: string | null;
}
