import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsService } from '../rbac/permissions.service';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AssignProjectsDto } from './dto/assign-projects.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { RemoveProjectsDto } from './dto/remove-projects.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

@GlobalScope()
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.usersService.create(
      dto,
      actor.id,
      access.bypassPermissions,
      actor.companyId,
    );
  }

  @Get()
  @RequirePermissions('user.view')
  @ApiOperation({ summary: 'List, search and filter users' })
  list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.list(query, actor.companyId);
  }

  @Get(':id')
  @RequirePermissions('user.view')
  @ApiOperation({ summary: 'View user details' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.getById(id, actor.companyId);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, dto, actor.companyId);
  }

  @Post(':id/activate')
  @RequirePermissions('user.activate')
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.activate(id, actor.companyId);
  }

  @Post(':id/deactivate')
  @RequirePermissions('user.deactivate')
  @ApiOperation({ summary: 'Deactivate user (blocks login)' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.deactivate(id, actor.companyId);
  }

  @Post(':id/reset-password')
  @RequirePermissions('user.reset_password')
  @ApiOperation({ summary: 'Admin reset user password' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.adminResetPassword(
      id,
      dto,
      actor.companyId,
    );
  }

  @Post(':id/roles')
  @RequirePermissions('user.assign_role')
  @ApiOperation({ summary: 'Assign roles (full replace)' })
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.usersService.assignRoles(
      id,
      dto,
      access.bypassPermissions,
      actor.companyId,
    );
  }

  @Post(':id/projects')
  @RequirePermissions('user.assign_project')
  @ApiOperation({ summary: 'Assign projects (merge; creates project-access records)' })
  assignProjects(
    @Param('id') id: string,
    @Body() dto: AssignProjectsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.assignProjects(
      id,
      dto,
      actor.id,
      actor.companyId,
    );
  }

  @Post(':id/projects/remove')
  @RequirePermissions('user.assign_project')
  @ApiOperation({ summary: 'Remove assigned projects (deactivates access records)' })
  removeProjects(
    @Param('id') id: string,
    @Body() dto: RemoveProjectsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.removeProjects(
      id,
      dto,
      actor.id,
      actor.companyId,
    );
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  @ApiOperation({ summary: 'Soft-delete user' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.softDeleteUser(
      id,
      actor.id,
      actor.companyId,
    );
  }
}
