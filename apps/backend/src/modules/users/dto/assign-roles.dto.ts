import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ type: [String], description: 'Full replacement list of role IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  roleIds!: string[];
}
