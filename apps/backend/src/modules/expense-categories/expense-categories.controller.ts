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
import {
  ConfigureEvidenceRulesDto,
  CreateExpenseCategoryDto,
  ListExpenseCategoriesQueryDto,
  SetExpenseCategoryParentDto,
  UpdateExpenseCategoryDto,
} from './dto/expense-category.dto';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoryStatus } from './schemas/expense-category.schema';

@ApiTags('Expense Categories')
@ApiBearerAuth()
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpenseCategoriesService) {}

  @Post()
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Create expense category' })
  create(
    @Body() dto: CreateExpenseCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Post('seed-standard')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({
    summary: 'Seed standard expense categories (idempotent)',
  })
  seed(@CurrentUser() actor: AuthUser) {
    return this.service.seedStandard(actor.id);
  }

  @Get('tree')
  @RequirePermissions('expense_category.view')
  @ApiOperation({ summary: 'View expense category hierarchy tree' })
  tree(@Query('status') status?: ExpenseCategoryStatus) {
    return this.service.getTree(status);
  }

  @Get('by-code/:categoryCode')
  @RequirePermissions('expense_category.view')
  @ApiOperation({ summary: 'Get expense category by code' })
  getByCode(@Param('categoryCode') categoryCode: string) {
    return this.service.getByCode(categoryCode);
  }

  @Get()
  @RequirePermissions('expense_category.view')
  @ApiOperation({ summary: 'List expense categories' })
  list(@Query() query: ListExpenseCategoriesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('expense_category.view')
  @ApiOperation({ summary: 'Get expense category by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Update expense category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/evidence-rules')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({
    summary:
      'Configure evidence rules (bill, signature, photo, approval limit)',
  })
  configureEvidenceRules(
    @Param('id') id: string,
    @Body() dto: ConfigureEvidenceRulesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.configureEvidenceRules(id, dto, actor.id);
  }

  @Post(':id/parent')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Set parent category (build hierarchy)' })
  setParent(
    @Param('id') id: string,
    @Body() dto: SetExpenseCategoryParentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setParent(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Activate expense category' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Deactivate expense category' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deactivate(id, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('expense_category.manage')
  @ApiOperation({ summary: 'Soft-delete expense category' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }
}
