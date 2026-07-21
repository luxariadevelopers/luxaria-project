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
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateOpeningBalancePackDto,
  ListOpeningBalancePacksQueryDto,
  UpdateOpeningBalancePackDto,
} from './dto/opening-balance.dto';
import { OpeningBalancesService } from './opening-balances.service';

@GlobalScope()
@ApiTags('Opening Balances')
@ApiBearerAuth()
@Controller('opening-balances')
export class OpeningBalancesController {
  constructor(private readonly service: OpeningBalancesService) {}

  @Post()
  @RequirePermissions('opening_balance.manage')
  @ApiOperation({
    summary: 'Create draft opening balance pack (lines must balance)',
  })
  create(
    @Body() dto: CreateOpeningBalancePackDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('opening_balance.view')
  @ApiOperation({ summary: 'List opening balance packs' })
  list(@Query() query: ListOpeningBalancePacksQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('opening_balance.view')
  @ApiOperation({ summary: 'Get opening balance pack' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('opening_balance.manage')
  @ApiOperation({ summary: 'Update draft opening balance pack' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOpeningBalancePackDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('opening_balance.post')
  @ApiOperation({
    summary:
      'Post opening balance pack — creates balanced opening journal entry',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('opening_balance.manage')
  @ApiOperation({ summary: 'Cancel draft opening balance pack' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
