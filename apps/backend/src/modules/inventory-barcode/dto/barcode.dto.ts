import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export enum BarcodeAction {
  Receive = 'receive',
  Issue = 'issue',
  Transfer = 'transfer',
  Count = 'count',
  Lookup = 'lookup',
}

export class GenerateBarcodeDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  batch?: string | null;
}

export class ScanBarcodeDto {
  @ApiProperty({
    description: 'Raw QR/barcode payload from scanner',
    example: 'LUX|MAT|MAT-000001|BATCH-A1',
  })
  @IsString()
  @MaxLength(500)
  payload!: string;

  @ApiPropertyOptional({ enum: BarcodeAction })
  @IsOptional()
  @IsEnum(BarcodeAction)
  action?: BarcodeAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}
