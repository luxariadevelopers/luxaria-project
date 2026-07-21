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
import { CustomerLoansService } from './customer-loans.service';
import {
  AddLoanCorrespondenceDto,
  AddLoanDisbursementDto,
  CreateCustomerLoanDto,
  ListCustomerLoanQueryDto,
  TransitionCustomerLoanDto,
  UpdateCustomerLoanDto,
  UpdatePendingDocumentDto,
} from './dto/customer-loan.dto';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'customer-loan', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Customer Loans')
@ApiBearerAuth()
@Controller('customer-loans')
export class CustomerLoansController {
  constructor(private readonly service: CustomerLoansService) {}

  @Post()
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Create customer loan application' })
  create(@Body() dto: CreateCustomerLoanDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('loan.view')
  @ApiOperation({ summary: 'List customer loans' })
  list(@Query() query: ListCustomerLoanQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('loan.view')
  @ApiOperation({ summary: 'Get customer loan' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Update draft customer loan' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerLoanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/transition')
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Transition loan status' })
  transitionStatus(
    @Param('id') id: string,
    @Body() dto: TransitionCustomerLoanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.transitionStatus(id, dto, actor.id);
  }

  @Post(':id/add-disbursement')
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Add loan disbursement' })
  addDisbursement(
    @Param('id') id: string,
    @Body() dto: AddLoanDisbursementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addDisbursement(id, dto, actor.id);
  }

  @Post(':id/add-correspondence')
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Add loan correspondence entry' })
  addCorrespondence(
    @Param('id') id: string,
    @Body() dto: AddLoanCorrespondenceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addCorrespondence(id, dto, actor.id);
  }

  @Patch(':id/pending-documents/:documentId')
  @RequirePermissions('loan.manage')
  @ApiOperation({ summary: 'Update pending document receipt' })
  updatePendingDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdatePendingDocumentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updatePendingDocument(id, documentId, dto, actor.id);
  }
}
