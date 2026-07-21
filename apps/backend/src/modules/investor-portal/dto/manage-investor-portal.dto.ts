import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  InvestorVisibleReportType,
} from '../schemas/investor-visible-report.schema';
import { InvestorProfitAllocationStatus } from '../schemas/investor-profit-allocation.schema';

export class PublishInvestorReportDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: InvestorVisibleReportType })
  @IsEnum(InvestorVisibleReportType)
  reportType!: InvestorVisibleReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentPath?: string;
}

export class RecordInvestorProfitDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ description: 'Outside-investor ProjectParticipant id' })
  @IsMongoId()
  participantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  financialYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  periodLabel?: string;

  @ApiProperty({ description: 'Total profit allocated to this investor' })
  @IsNumber()
  @Min(0)
  allocatedAmount!: number;

  @ApiPropertyOptional({
    description: 'Amount already distributed (defaults to 0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distributedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}

export class UpdateDistributedProfitDto {
  @ApiProperty({ description: 'New cumulative distributed amount' })
  @IsNumber()
  @Min(0)
  distributedAmount!: number;
}

export class ListInvestorProfitAllocationsQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional({ enum: InvestorProfitAllocationStatus })
  @IsOptional()
  @IsEnum(InvestorProfitAllocationStatus)
  status?: InvestorProfitAllocationStatus;
}
