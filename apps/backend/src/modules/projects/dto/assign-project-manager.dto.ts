import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignProjectManagerDto {
  @ApiProperty()
  @IsMongoId()
  projectManagerId!: string;
}
