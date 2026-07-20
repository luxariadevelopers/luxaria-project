import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProposedHoldingLineDto {
  @ApiProperty()
  @IsMongoId()
  directorId!: string;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfShares!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  faceValue!: number;

  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  documentId?: string | null;
}

export class ProposeShareholdingDto {
  @ApiProperty({ example: 'Board-approved redistribution of equity' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;

  @ApiPropertyOptional({ example: 'BR-2026-SH-01' })
  @IsOptional()
  @IsString()
  approvalReference?: string | null;

  @ApiProperty({ type: [ProposedHoldingLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProposedHoldingLineDto)
  proposedHoldings!: ProposedHoldingLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;
}
