import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateContractorPaymentDto,
  ListContractorPaymentsQueryDto,
  UpdateContractorPaymentDto,
} from './dto/contractor-payment.dto';
import { ContractorPaymentsService } from './contractor-payments.service';

@ApiTags('Contractor Payments')
@ApiBearerAuth()
@Controller('contractor-payments')
export class ContractorPaymentsController {
  constructor(private readonly paymentsService: ContractorPaymentsService) {}

  @Post()
  @RequirePermissions('payment.release')
  @ApiOperation({
    summary: 'Create contractor payment against posted running bills (draft)',
  })
  create(
    @Body() dto: CreateContractorPaymentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'List contractor payments' })
  list(@Query() query: ListContractorPaymentsQueryDto) {
    return this.paymentsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'Get contractor payment by id' })
  getById(@Param('id') id: string) {
    return this.paymentsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Update draft contractor payment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorPaymentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Submit for approval (Draft → Approval)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('payment.approve')
  @ApiOperation({ summary: 'Approve payment (Approval → Released)' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.approve(id, actor.id);
  }

  @Post(':id/release')
  @RequirePermissions('payment.release')
  @ApiOperation({
    summary: 'Record bank release (requires paymentProof + transactionReference)',
  })
  release(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.release(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('payment.approve')
  @ApiOperation({ summary: 'Verify payment (Released → Verified)' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.verify(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('payment.approve')
  @ApiOperation({
    summary:
      'Post accounting (Verified → Posted). Dr Contractor Payable / Cr Bank (+ withholdings)',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Cancel open contractor payment' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.cancel(id, actor.id);
  }
}
