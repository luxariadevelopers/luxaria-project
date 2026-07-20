import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import type { AppConfig } from '../../config/configuration';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

@GlobalScope()
@ApiTags('Version')
@Controller('version')
export class VersionController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application version information' })
  @ApiOkResponse({ description: 'Version details wrapped in standard API response' })
  getVersion() {
    return createSuccessResponse(
      {
        name: this.configService.getOrThrow<AppConfig['appName']>('appName'),
        version: this.configService.getOrThrow<AppConfig['appVersion']>('appVersion'),
        environment: this.configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv'),
        apiPrefix: '/api/v1',
      },
      'Version retrieved successfully',
    );
  }
}
