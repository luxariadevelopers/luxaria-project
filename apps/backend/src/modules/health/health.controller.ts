import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application health check' })
  @ApiOkResponse({ description: 'Health status wrapped in standard API response' })
  getHealth() {
    return createSuccessResponse(
      this.healthService.getHealth(),
      'Health check successful',
    );
  }
}
