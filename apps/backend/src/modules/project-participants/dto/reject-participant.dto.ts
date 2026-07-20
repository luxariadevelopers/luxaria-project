import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectParticipantDto {
  @ApiProperty({ example: 'Profit share does not match board resolution' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  rejectionReason!: string;
}
