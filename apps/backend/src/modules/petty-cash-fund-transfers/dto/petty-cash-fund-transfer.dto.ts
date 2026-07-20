import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PettyCashFundTransferStatus } from '../schemas/petty-cash-fund-transfer.schema';

export class CreatePettyCashFundTransferDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ description: 'Approved weekly petty-cash requirement id' })
  @IsMongoId()
  requestId!: string;

  @ApiProperty()
  @IsMongoId()
  sourceBankAccountId!: string;

  @ApiProperty()
  @IsMongoId()
  destinationPettyCashAccountId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  transferDate!: string;

  @ApiProperty({ example: 25000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionReference?: string | null;

  @ApiPropertyOptional({
    description: 'Payment proof path or document reference',
  })
  @IsOptional()
  @IsString()
  paymentProof?: string | null;
}

export class UpdatePettyCashFundTransferDto extends PartialType(
  CreatePettyCashFundTransferDto,
) {}

export class CancelPettyCashFundTransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cancellationReason!: string;
}

export class ListPettyCashFundTransfersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  requestId?: string;

  @ApiPropertyOptional({ enum: PettyCashFundTransferStatus })
  @IsOptional()
  @IsEnum(PettyCashFundTransferStatus)
  status?: PettyCashFundTransferStatus;
}
