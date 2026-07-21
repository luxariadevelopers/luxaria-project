import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import {
  CreatePermissionOverrideDto,
  ListPermissionOverridesQueryDto,
  UpdatePermissionOverrideDto,
} from './dto/permission-override.dto';
import { PermissionOverridesService } from './permission-overrides.service';

@GlobalScope()
@ApiTags('Permission Overrides')
@ApiBearerAuth()
@Controller('permission-overrides')
export class PermissionOverridesController {
  constructor(
    private readonly permissionOverridesService: PermissionOverridesService,
  ) {}

  @Post()
  @RequirePermissions('permission.override.manage')
  @ApiOperation({ summary: 'Create a permission allow/deny override' })
  create(
    @Body() dto: CreatePermissionOverrideDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.permissionOverridesService.create(
      dto,
      actor.companyId,
      actor.id,
    );
  }

  @Get()
  @RequirePermissions('permission.override.manage')
  @ApiOperation({ summary: 'List permission overrides for company' })
  list(
    @Query() query: ListPermissionOverridesQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.permissionOverridesService.list(query, actor.companyId);
  }

  @Get(':id')
  @RequirePermissions('permission.override.manage')
  @ApiOperation({ summary: 'Get permission override' })
  getById(@Param('id') id: string) {
    return this.permissionOverridesService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('permission.override.manage')
  @ApiOperation({ summary: 'Update permission override' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionOverrideDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.permissionOverridesService.update(id, dto, actor.id);
  }
}
