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
import {
  CreateRfqDto,
  ListRfqsQueryDto,
  UpdateRfqDto,
} from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@ProjectScoped({
  mode: 'filter',
  operation: 'read',
})
@ApiTags('RFQ')
@ApiBearerAuth()
@Controller('rfqs')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Create draft RFQ from an approved purchase request' })
  create(@Body() dto: CreateRfqDto, @CurrentUser() actor: AuthUser) {
    return this.rfqService.create(dto, actor.id, actor.companyId);
  }

  @Get()
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'List RFQs (project-scoped)' })
  list(@Query() query: ListRfqsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.rfqService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'Get RFQ by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rfqService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Update draft RFQ' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRfqDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.rfqService.update(id, dto, actor.id);
  }

  @Post(':id/issue')
  @RequirePermissions('quotation.manage')
  @ApiOperation({
    summary: 'Issue RFQ to invited vendors (email blast stub)',
  })
  issue(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rfqService.issue(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Close an issued RFQ' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rfqService.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quotation.manage')
  @ApiOperation({ summary: 'Cancel RFQ' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rfqService.cancel(id, actor.id);
  }

  @Get(':id/responses')
  @RequirePermissions('quotation.view')
  @ApiOperation({ summary: 'List vendor quotations linked to this RFQ' })
  listResponses(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rfqService.listResponses(id, actor.id);
  }
}
