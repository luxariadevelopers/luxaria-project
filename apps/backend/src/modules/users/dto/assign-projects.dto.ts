import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId } from 'class-validator';

export class AssignProjectsDto {
  @ApiProperty({ type: [String], description: 'Project IDs to assign (merged with existing)' })
  @IsArray()
  @IsMongoId({ each: true })
  projectIds!: string[];
}
