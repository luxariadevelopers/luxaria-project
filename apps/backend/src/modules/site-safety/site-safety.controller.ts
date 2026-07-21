import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateSiteSafetyDto,
  InvestigateSiteSafetyDto,
  ListSiteSafetyQueryDto,
  UpdateSiteSafetyDto,
} from './dto/site-safety.dto';
import { SiteSafetyService } from './site-safety.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'site-safety', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Site Safety')
@ApiBearerAuth()
@Controller('site-safety')
export class SiteSafetyController {
  constructor(private readonly service: SiteSafetyService) {}

  @Post()
  @RequirePermissions('safety.manage')
  @ApiOperation({ summary: 'Create HSE / site safety record' })
  create(
    @Body() dto: CreateSiteSafetyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('safety.view')
  @ApiOperation({ summary: 'List site safety records' })
  list(@Query() query: ListSiteSafetyQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('safety.view')
  @ApiOperation({ summary: 'Get site safety record' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('safety.manage')
  @ApiOperation({ summary: 'Update open site safety record' })
  update(@Param('id') id: string, @Body() dto: UpdateSiteSafetyDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/investigate')
  @RequirePermissions('safety.manage')
  @ApiOperation({ summary: 'Move to investigating' })
  investigate(
    @Param('id') id: string,
    @Body() dto: InvestigateSiteSafetyDto,
  ) {
    return this.service.investigate(id, dto);
  }

  @Post(':id/close')
  @RequirePermissions('safety.manage')
  @ApiOperation({ summary: 'Close site safety record' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.close(id, actor.id);
  }
}
