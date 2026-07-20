import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class PresignUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty({ example: 'investors' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'module must be lowercase alphanumeric with underscores',
  })
  module!: string;

  @ApiProperty({ example: 'investor' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/)
  entityType!: string;

  @ApiProperty()
  @IsMongoId()
  entityId!: string;

  @ApiProperty({ example: 'passport-scan.pdf' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  originalFileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 204800, description: 'Declared size in bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  size!: number;

  @ApiProperty({ example: 'kyc' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/)
  documentType!: string;
}

export class ConfirmUploadDto {
  @ApiPropertyOptional({
    description: 'Optional client-computed SHA-256 hex; verified when S3 provides checksum',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'checksum must be a 64-character hex SHA-256',
  })
  checksum?: string;
}
