import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RequestUnlockDto {
  @ApiProperty({ example: 'Need to reverse a misposted journal from March' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
