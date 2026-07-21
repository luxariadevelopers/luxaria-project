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
import { CustomerInvoicesService } from './customer-invoices.service';
import {
  CancelCustomerInvoiceDto,
  CreateCustomerInvoiceDto,
  ListCustomerInvoicesQueryDto,
  UpdateCustomerInvoiceDto,
} from './dto/customer-invoice.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'customer-invoice', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Customer Invoices')
@ApiBearerAuth()
@Controller('customer-invoices')
export class CustomerInvoicesController {
  constructor(private readonly service: CustomerInvoicesService) {}

  @Post()
  @RequirePermissions('customer_invoice.manage')
  @ApiOperation({ summary: 'Create customer invoice (draft)' })
  create(@Body() dto: CreateCustomerInvoiceDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('customer_invoice.view')
  @ApiOperation({ summary: 'List customer invoices' })
  list(@Query() query: ListCustomerInvoicesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('customer_invoice.view')
  @ApiOperation({ summary: 'Get customer invoice' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('customer_invoice.manage')
  @ApiOperation({ summary: 'Update draft customer invoice' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerInvoiceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('customer_invoice.post')
  @ApiOperation({
    summary:
      'Post invoice — Dr Customer Advance, Cr Sales + Output GST (revenue recognition)',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('customer_invoice.manage')
  @ApiOperation({ summary: 'Cancel draft customer invoice' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelCustomerInvoiceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }
}
