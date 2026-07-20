import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsMongoId } from 'class-validator';

export class AssignDirectorsDto {
  @ApiProperty({ type: [String], description: 'Full replace of assigned directors' })
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  directorIds!: string[];
}
