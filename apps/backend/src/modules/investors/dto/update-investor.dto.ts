import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateInvestorDto } from './create-investor.dto';
import { InvestorStatus } from '../schemas/investor.schema';

export class UpdateInvestorDto extends PartialType(
  OmitType(CreateInvestorDto, ['status'] as const),
) {
  @ApiPropertyOptional({
    enum: InvestorStatus,
    description: 'Prefer /activate and /deactivate for status transitions',
  })
  @IsOptional()
  @IsEnum(InvestorStatus)
  status?: InvestorStatus;
}
