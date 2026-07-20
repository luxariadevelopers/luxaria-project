import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProjectAccessStatus } from '../schemas/project-assignment.schema';

export class ListProjectAssignmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: ProjectAccessStatus })
  @IsOptional()
  @IsEnum(ProjectAccessStatus)
  status?: ProjectAccessStatus;
}
