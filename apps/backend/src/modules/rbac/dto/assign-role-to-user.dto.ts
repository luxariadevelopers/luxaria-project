import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsMongoId } from 'class-validator';

export class AssignRoleToUserDto {
  @ApiProperty({ type: [String], description: 'Full replace of user roleIds' })
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  roleIds!: string[];
}
