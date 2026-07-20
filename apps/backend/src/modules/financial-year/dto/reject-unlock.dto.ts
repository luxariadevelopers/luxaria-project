import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectUnlockDto {
  @ApiProperty({ example: 'Use next period adjustment instead' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  rejectionReason!: string;
}
