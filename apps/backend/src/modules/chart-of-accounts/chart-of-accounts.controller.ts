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
import { ChartOfAccountsService } from './chart-of-accounts.service';
import {
  CreateAccountDto,
  ListAccountsQueryDto,
  SetAccountParentDto,
  UpdateAccountDto,
} from './dto/account.dto';
import { AccountStatus } from './schemas/account.schema';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';

@GlobalScope()
@ApiTags('Chart of Accounts')
@ApiBearerAuth()
@Controller('accounts')
export class ChartOfAccountsController {
  constructor(private readonly service: ChartOfAccountsService) {}

  @Post()
  @RequirePermissions('account.manage')
  @ApiOperation({ summary: 'Create account' })
  create(@Body() dto: CreateAccountDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Post('seed-standard')
  @RequirePermissions('account.manage')
  @ApiOperation({
    summary: 'Seed standard construction chart of accounts (idempotent)',
  })
  seed(@CurrentUser() actor: AuthUser) {
    return this.service.seedStandard(actor.id);
  }

  @Get('tree')
  @RequirePermissions('account.view')
  @ApiOperation({ summary: 'View account hierarchy tree' })
  tree(@Query('status') status?: AccountStatus) {
    return this.service.getTree(status);
  }

  @Get('by-code/:accountCode')
  @RequirePermissions('account.view')
  @ApiOperation({ summary: 'Get account by code' })
  getByCode(@Param('accountCode') accountCode: string) {
    return this.service.getByCode(accountCode);
  }

  @Get()
  @RequirePermissions('account.view')
  @ApiOperation({ summary: 'List accounts' })
  list(@Query() query: ListAccountsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('account.view')
  @ApiOperation({ summary: 'Get account by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('account.manage')
  @ApiOperation({ summary: 'Update account' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/parent')
  @RequirePermissions('account.manage')
  @ApiOperation({ summary: 'Build / move account hierarchy (set parent)' })
  setParent(
    @Param('id') id: string,
    @Body() dto: SetAccountParentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setParent(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('account.manage')
  @ApiOperation({ summary: 'Activate account' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('account.manage')
  @ApiOperation({ summary: 'Deactivate account' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deactivate(id, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('account.manage')
  @ApiOperation({
    summary: 'Soft-delete account (blocked when postings exist)',
  })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }
}
