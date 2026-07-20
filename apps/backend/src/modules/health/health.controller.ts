import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { HealthService } from './health.service';

@GlobalScope()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application health check' })
  @ApiOkResponse({ description: 'Health status wrapped in standard API response' })
  async getHealth() {
    return createSuccessResponse(
      await this.healthService.getHealth(),
      'Health check successful',
    );
  }

  @Get('operations')
  @ApiBearerAuth()
  @RequirePermissions('audit.view')
  @ApiOperation({
    summary: 'Operational health, alert config, and delivery visibility',
  })
  @ApiOkResponse({
    description: 'Operations health wrapped in standard API response',
  })
  async getOperationsHealth() {
    return createSuccessResponse(
      await this.healthService.getOperationsHealth(),
      'Operations health retrieved successfully',
    );
  }
}
