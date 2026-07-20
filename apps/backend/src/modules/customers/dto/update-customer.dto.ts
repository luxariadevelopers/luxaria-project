import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomerStatus } from '../schemas/customer.schema';

export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['status'] as const),
) {
  @ApiPropertyOptional({
    enum: CustomerStatus,
    description: 'Prefer /activate and /deactivate for status transitions',
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
