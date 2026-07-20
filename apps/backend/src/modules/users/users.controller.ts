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
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'Create user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('user.view')
  @ApiOperation({ summary: 'List, search and filter users' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  @RequirePermissions('user.view')
  @ApiOperation({ summary: 'View user details' })
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('user.activate')
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('user.deactivate')
  @ApiOperation({ summary: 'Deactivate user (blocks login)' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/reset-password')
  @RequirePermissions('user.reset_password')
  @ApiOperation({ summary: 'Admin reset user password' })
  resetPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
    return this.usersService.adminResetPassword(id, dto);
  }

  @Post(':id/roles')
  @RequirePermissions('user.assign_role')
  @ApiOperation({ summary: 'Assign roles (full replace)' })
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }

  @Post(':id/projects')
  @RequirePermissions('user.assign_project')
  @ApiOperation({ summary: 'Assign projects (merge; creates project-access records)' })
  assignProjects(
    @Param('id') id: string,
    @Body() dto: AssignProjectsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.assignProjects(id, dto, actor.id);
  }

  @Post(':id/projects/remove')
  @RequirePermissions('user.assign_project')
  @ApiOperation({ summary: 'Remove assigned projects (deactivates access records)' })
  removeProjects(
    @Param('id') id: string,
    @Body() dto: RemoveProjectsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.removeProjects(id, dto, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  @ApiOperation({ summary: 'Soft-delete user' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.softDeleteUser(id, actor.id);
  }
}
