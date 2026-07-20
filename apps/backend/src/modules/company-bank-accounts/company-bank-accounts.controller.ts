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
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import {
  BankLedgerQueryDto,
  CreateCompanyBankAccountDto,
  ListCompanyBankAccountsQueryDto,
  SetDefaultBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/company-bank-account.dto';

@ApiTags('Company Bank Accounts')
@ApiBearerAuth()
@Controller('company-bank-accounts')
export class CompanyBankAccountsController {
  constructor(private readonly service: CompanyBankAccountsService) {}

  @Post()
  @RequirePermissions('bank.manage')
  @ApiOperation({ summary: 'Create company / project bank account' })
  create(
    @Body() dto: CreateCompanyBankAccountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('bank.view')
  @ApiOperation({
    summary: 'List bank accounts (masked numbers only)',
  })
  list(
    @Query() query: ListCompanyBankAccountsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('bank.view')
  @ApiOperation({
    summary:
      'Get bank account (full account number only with bank.view_sensitive / bank.manage)',
  })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getById(id, actor.id);
  }

  @Get(':id/balance')
  @RequirePermissions('bank.view')
  @ApiOperation({ summary: 'View bank account balance (opening + journal net)' })
  balance(@Param('id') id: string) {
    return this.service.getBalance(id);
  }

  @Get(':id/ledger')
  @RequirePermissions('bank.view')
  @ApiOperation({ summary: 'View transaction ledger for linked COA account' })
  ledger(@Param('id') id: string, @Query() query: BankLedgerQueryDto) {
    return this.service.getLedger(id, query);
  }

  @Patch(':id')
  @RequirePermissions('bank.manage')
  @ApiOperation({ summary: 'Update bank account' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyBankAccountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('bank.manage')
  @ApiOperation({ summary: 'Activate bank account' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('bank.manage')
  @ApiOperation({ summary: 'Deactivate bank account' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deactivate(id, actor.id);
  }

  @Post(':id/set-default')
  @RequirePermissions('bank.manage')
  @ApiOperation({
    summary: 'Assign as default project (or company) bank account',
  })
  setDefault(
    @Param('id') id: string,
    @Body() dto: SetDefaultBankAccountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setDefault(id, actor.id, dto);
  }
}
