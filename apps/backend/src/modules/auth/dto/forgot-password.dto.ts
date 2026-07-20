import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address or mobile number',
    example: 'director@luxaria.dev',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;
}
