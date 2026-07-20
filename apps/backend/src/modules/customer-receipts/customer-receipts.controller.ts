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
import { CustomerReceiptsService } from './customer-receipts.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import {
  CancelCustomerReceiptDto,
  CreateCustomerReceiptDto,
  ListCustomerReceiptsQueryDto,
  UpdateCustomerReceiptDto,
} from './dto/customer-receipt.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'customer-receipt', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Customer Receipts')
@ApiBearerAuth()
@Controller('customer-receipts')
export class CustomerReceiptsController {
  constructor(
    private readonly customerReceiptsService: CustomerReceiptsService,
  ) {}

  @Post()
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Create customer receipt (collection)' })
  create(
    @Body() dto: CreateCustomerReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customerReceiptsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'List customer receipts' })
  list(
    @Query() query: ListCustomerReceiptsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customerReceiptsService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'Get customer receipt by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.customerReceiptsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Update draft customer receipt' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customerReceiptsService.update(id, dto, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('collection.approve')
  @ApiOperation({
    summary:
      'Post receipt — allocate demands, create journal, generate PDF',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.customerReceiptsService.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('collection.create')
  @ApiOperation({ summary: 'Cancel draft customer receipt' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelCustomerReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customerReceiptsService.cancel(id, dto, actor.id);
  }

  @Post(':id/regenerate-pdf')
  @RequirePermissions('collection.view')
  @ApiOperation({ summary: 'Regenerate receipt PDF' })
  regeneratePdf(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.customerReceiptsService.regeneratePdf(id, actor.id);
  }
}
