import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Shared DTO for suspend / blacklist / reactivate (reason required). */
export class StatusTransitionDto {
  @ApiProperty({
    example: 'Safety non-compliance pending corrective action',
    description: 'Mandatory reason recorded on status event + audit log',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

/** Alias kept for existing block clients — reason now required. */
export class BlockContractorDto extends StatusTransitionDto {}

export class SuspendContractorDto extends StatusTransitionDto {}

export class ReactivateContractorDto extends StatusTransitionDto {}

export class DeactivateContractorDto {
  @ApiPropertyOptional({ example: 'No longer engaged' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
