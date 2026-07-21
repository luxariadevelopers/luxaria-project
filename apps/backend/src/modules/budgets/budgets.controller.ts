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
import { BudgetsService } from './budgets.service';
import {
  CreateBudgetDto,
  ListBudgetsQueryDto,
  RejectBudgetDto,
  ReviseBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'budget', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Post()
  @RequirePermissions('budget.manage')
  @ApiOperation({ summary: 'Create budget (draft v1)' })
  create(@Body() dto: CreateBudgetDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('budget.view')
  @ApiOperation({ summary: 'List budgets' })
  list(@Query() query: ListBudgetsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('budget.view')
  @ApiOperation({ summary: 'Get budget' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('budget.manage')
  @ApiOperation({ summary: 'Update draft budget' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('budget.manage')
  @ApiOperation({ summary: 'Submit draft → pending_approval' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('budget.approve')
  @ApiOperation({ summary: 'Approve pending budget' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('budget.approve')
  @ApiOperation({ summary: 'Reject pending budget → draft' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBudgetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('budget.manage')
  @ApiOperation({ summary: 'Revise approved budget (supersede + new draft version)' })
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseBudgetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.revise(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('budget.manage')
  @ApiOperation({ summary: 'Cancel draft or pending_approval budget' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
