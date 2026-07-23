import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

@GlobalScope()
@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('department.manage')
  @ApiOperation({ summary: 'Create department' })
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.create(dto, actor.companyId, actor.id);
  }

  @Get()
  @RequirePermissions('department.view')
  @ApiOperation({ summary: 'List departments' })
  list(@CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.list(actor.companyId);
  }

  @Patch(':id')
  @RequirePermissions('department.manage')
  @ApiOperation({ summary: 'Update department' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.update(id, dto, actor.companyId, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('department.manage')
  @ApiOperation({ summary: 'Activate department' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.activate(id, actor.companyId, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('department.manage')
  @ApiOperation({ summary: 'Deactivate department' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.deactivate(id, actor.companyId, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('department.manage')
  @ApiOperation({ summary: 'Soft-delete department (blocked if still in use)' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.departmentsService.remove(id, actor.companyId, actor.id);
  }
}
