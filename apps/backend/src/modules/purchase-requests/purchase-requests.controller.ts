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
import {
  ApprovePurchaseRequestDto,
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  RejectPurchaseRequestDto,
  ReturnPurchaseRequestDto,
  ReviewPurchaseRequestDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase-request.dto';
import { PurchaseRequestsService } from './purchase-requests.service';

@ApiTags('Purchase Requests')
@ApiBearerAuth()
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly purchaseRequestsService: PurchaseRequestsService) {}

  @Post()
  @RequirePermissions('purchase.request')
  @ApiOperation({ summary: 'Create purchase request (draft)' })
  create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() actor: AuthUser) {
    return this.purchaseRequestsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'List / search purchase requests' })
  list(@Query() query: ListPurchaseRequestsQueryDto) {
    return this.purchaseRequestsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'Get purchase request' })
  getById(@Param('id') id: string) {
    return this.purchaseRequestsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('purchase.request')
  @ApiOperation({ summary: 'Update draft/returned purchase request' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseRequestsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('purchase.request')
  @ApiOperation({ summary: 'Submit purchase request for review' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseRequestsService.submit(id, actor.id);
  }

  @Post(':id/review')
  @RequirePermissions('purchase.approve')
  @ApiOperation({ summary: 'Mark purchase request as reviewed' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewPurchaseRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseRequestsService.review(id, dto, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('purchase.approve')
  @ApiOperation({
    summary: 'Approve purchase request (supports partial line approval)',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseRequestsService.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('purchase.approve')
  @ApiOperation({ summary: 'Reject purchase request' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPurchaseRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseRequestsService.reject(id, dto, actor.id);
  }

  @Post(':id/return')
  @RequirePermissions('purchase.approve')
  @ApiOperation({ summary: 'Return purchase request for correction' })
  returnForCorrection(
    @Param('id') id: string,
    @Body() dto: ReturnPurchaseRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseRequestsService.returnForCorrection(id, dto, actor.id);
  }

  @Post(':id/start-sourcing')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Move approved request to sourcing' })
  startSourcing(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseRequestsService.startSourcing(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Close purchase request' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseRequestsService.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchase.request')
  @ApiOperation({ summary: 'Cancel draft/submitted/reviewed request' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseRequestsService.cancel(id, actor.id);
  }
}
