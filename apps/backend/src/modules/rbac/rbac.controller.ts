import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { SkipPermissions } from './decorators/skip-permissions.decorator';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { AssignRoleToUserDto } from './dto/assign-role-to-user.dto';
import { CloneRoleDto } from './dto/clone-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PERMISSIONS } from './permissions.catalog';
import { PermissionsService } from './permissions.service';
import { RolesService } from './roles.service';
import { UsersService } from '../users/users.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

@GlobalScope()
@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  @Get('permissions')
  @RequirePermissions('permission.view')
  @ApiOperation({ summary: 'List canonical permission catalog' })
  listPermissions() {
    return createSuccessResponse(
      PERMISSIONS.map((code) => {
        const [module, action] = code.split('.');
        return { code, module, action };
      }),
      'Permissions catalog fetched successfully',
    );
  }

  @Get('me/permissions')
  @SkipPermissions()
  @ApiOperation({ summary: 'Current user effective permissions and roles' })
  async myPermissions(@CurrentUser() user: AuthUser) {
    const access = await this.permissionsService.resolveUserAccess(user.id);
    return createSuccessResponse(access, 'Current user permissions fetched successfully');
  }

  @Get('roles')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'List roles' })
  listRoles(@Query() query: ListRolesQueryDto) {
    return this.rolesService.list(query);
  }

  @Get('roles/:id')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'Get role by id' })
  getRole(@Param('id') id: string) {
    return this.rolesService.getById(id);
  }

  @Post('roles')
  @RequirePermissions('role.create')
  @ApiOperation({ summary: 'Create role' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.rolesService.create(
      dto,
      actor.id,
      access.bypassPermissions,
    );
  }

  @Patch('roles/:id')
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Update role' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.rolesService.update(
      id,
      dto,
      actor.id,
      access.bypassPermissions,
    );
  }

  @Post('roles/:id/permissions')
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Assign permissions to role (full replace)' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.rolesService.assignPermissions(id, dto, actor.id);
  }

  @Post('roles/:id/clone')
  @RequirePermissions('role.create')
  @ApiOperation({ summary: 'Clone role (permissions copied; bypass never copied)' })
  cloneRole(
    @Param('id') id: string,
    @Body() dto: CloneRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.rolesService.clone(id, dto, actor.id);
  }

  @Post('roles/:id/activate')
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Activate role' })
  activateRole(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rolesService.activate(id, actor.id);
  }

  @Post('roles/:id/deactivate')
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Deactivate role' })
  deactivateRole(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rolesService.deactivate(id, actor.id);
  }

  @Post('users/:userId/roles')
  @RequirePermissions('role.assign')
  @ApiOperation({ summary: 'Assign roles to user (full replace)' })
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleToUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.usersService.assignRoles(
      userId,
      dto,
      access.bypassPermissions,
      actor.companyId,
    );
  }
}
