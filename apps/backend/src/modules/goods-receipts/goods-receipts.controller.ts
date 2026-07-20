import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateGoodsReceiptDto,
  ListGoodsReceiptsQueryDto,
  QualityAcceptGoodsReceiptDto,
  UpdateGoodsReceiptDto,
} from './dto/goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'goods-receipt', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Goods Receipts')
@ApiBearerAuth()
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @RequirePermissions('grn.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key for offline create retries',
  })
  @ApiOperation({
    summary: 'Create goods receipt (draft, or submitted when submit=true)',
  })
  create(
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.goodsReceiptsService.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'List goods receipts' })
  list(
    @Query() query: ListGoodsReceiptsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.goodsReceiptsService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Get goods receipt' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.goodsReceiptsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Update draft goods receipt' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.goodsReceiptsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Submit goods receipt' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.goodsReceiptsService.submit(id, actor.id);
  }

  @Post(':id/quality-check')
  @RequirePermissions('grn.approve')
  @ApiOperation({ summary: 'Move GRN to quality check' })
  startQualityCheck(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.goodsReceiptsService.startQualityCheck(id, actor.id);
  }

  @Post(':id/accept')
  @RequirePermissions('grn.approve')
  @ApiOperation({
    summary: 'Record QC acceptance (full or partial)',
  })
  accept(
    @Param('id') id: string,
    @Body() dto: QualityAcceptGoodsReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.goodsReceiptsService.accept(id, dto, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('grn.approve')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
  })
  @ApiOperation({
    summary: 'Post GRN — stock increases for accepted quantity only',
  })
  post(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.goodsReceiptsService.post(id, actor.id, idempotencyKey);
  }

  @Post(':id/cancel')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Cancel goods receipt' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.goodsReceiptsService.cancel(id, actor.id);
  }
}
