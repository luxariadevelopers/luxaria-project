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
  CreateSaleAgreementDto,
  ListSaleAgreementsQueryDto,
  RejectSaleAgreementDto,
  ReviseSaleAgreementDto,
  UpdateSaleAgreementDto,
} from './dto/sale-agreement.dto';
import { SaleAgreementsService } from './sale-agreements.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'sale-agreement', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Sale Agreements')
@ApiBearerAuth()
@Controller('sale-agreements')
export class SaleAgreementsController {
  constructor(private readonly service: SaleAgreementsService) {}

  @Post()
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Create draft sale agreement' })
  create(@Body() dto: CreateSaleAgreementDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('agreement.view')
  @ApiOperation({ summary: 'List sale agreements' })
  list(@Query() query: ListSaleAgreementsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('agreement.view')
  @ApiOperation({ summary: 'Get sale agreement' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Update draft sale agreement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSaleAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Submit draft → pending_approval' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('agreement.approve')
  @ApiOperation({ summary: 'Approve pending sale agreement' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('agreement.approve')
  @ApiOperation({ summary: 'Reject pending sale agreement' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectSaleAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/execute')
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Execute approved sale agreement' })
  execute(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.execute(id, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Create new version from approved/executed agreement' })
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseSaleAgreementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.revise(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('agreement.manage')
  @ApiOperation({ summary: 'Cancel draft / pending / approved agreement' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
