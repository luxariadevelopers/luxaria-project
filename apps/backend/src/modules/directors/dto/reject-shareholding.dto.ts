import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectShareholdingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  rejectionReason!: string;
}
