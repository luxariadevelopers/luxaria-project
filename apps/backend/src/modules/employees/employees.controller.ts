import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsService } from '../rbac/permissions.service';
import {
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  ProvisionSiteEngineerDto,
  SyncEmployeeModuleAccessDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@GlobalScope()
@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('provision-site-engineer')
  @RequirePermissions(
    'employee.create',
    'user.create',
    'project_access.assign',
    'site_access.assign',
  )
  @ApiOperation({
    summary:
      'Provision Site Engineer: employee + login user + role + project + site',
  })
  async provisionSiteEngineer(
    @Body() dto: ProvisionSiteEngineerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    const access = await this.permissionsService.resolveUserAccess(actor.id);
    return this.employeesService.provisionSiteEngineer(
      dto,
      actor.companyId,
      actor.id,
      access.bypassPermissions,
    );
  }

  @Post()
  @RequirePermissions('employee.create')
  @ApiOperation({ summary: 'Create employee' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.create(dto, actor.companyId, actor.id);
  }

  @Get()
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'List employees' })
  list(
    @Query() query: ListEmployeesQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.list(query, actor.companyId);
  }

  @Get(':id')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get employee' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.getById(id, actor.companyId);
  }

  @Get(':id/access')
  @RequirePermissions('employee.view')
  @ApiOperation({
    summary: 'Employee access summary (roles, projects, sites, overrides)',
  })
  getAccess(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.getAccessSummary(id, actor.companyId);
  }

  @Put(':id/module-access')
  @RequirePermissions('employee.update')
  @ApiOperation({
    summary:
      'Sync web/mobile module visibility for an employee (global deny overrides)',
  })
  syncModuleAccess(
    @Param('id') id: string,
    @Body() dto: SyncEmployeeModuleAccessDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.syncModuleAccess(
      id,
      dto,
      actor.companyId,
      actor.id,
    );
  }

  @Patch(':id')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Update employee' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.update(id, dto, actor.companyId, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('employee.deactivate')
  @ApiOperation({ summary: 'Deactivate / suspend employee' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.employeesService.deactivate(id, actor.companyId, actor.id);
  }
}
