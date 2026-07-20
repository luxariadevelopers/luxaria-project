import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Operation successful' })
  message!: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ type: Object, example: {} })
  meta?: Record<string, unknown>;
}

export function createSuccessResponse<T>(
  data?: T,
  message = 'Operation successful',
  meta: Record<string, unknown> = {},
): ApiResponseDto<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
