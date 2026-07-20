import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetailDto {
  @ApiPropertyOptional({ example: 'email' })
  field?: string;

  @ApiProperty({ example: 'must be an email' })
  message!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  errorCode!: string;

  @ApiProperty({ example: 'Human-readable message' })
  message!: string;

  @ApiProperty({ type: [ApiErrorDetailDto], example: [] })
  details!: ApiErrorDetailDto[];

  @ApiProperty({ example: 'req_123' })
  requestId!: string;

  @ApiProperty({ example: '2026-07-17T04:30:00.000Z' })
  timestamp!: string;
}
