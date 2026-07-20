import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { NotificationChannel } from '../../notifications/notifications.constants';

export class PreviewDigestQueryDto {
  @ApiPropertyOptional({
    description:
      'Calendar date the digest covers (defaults to yesterday, UTC)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Preview for a specific director user (defaults to current user)',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}

export class SendDigestDto {
  @ApiPropertyOptional({
    description:
      'Calendar date the digest covers (defaults to yesterday, UTC)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Limit send to these user ids (defaults to all directors)',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Delivery channels (default: in_app, email, push)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Re-send even if a digest was already delivered for the date',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class RunDigestDto extends SendDigestDto {}
