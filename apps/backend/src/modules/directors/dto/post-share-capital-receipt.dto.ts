import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PostShareCapitalReceiptDto {
  @ApiProperty({
    description:
      'Company bank account that received director share capital (bank book)',
  })
  @IsMongoId()
  bankAccountId!: string;

  @ApiPropertyOptional({ example: '2026-07-21' })
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string | null;
}
