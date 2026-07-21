import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  AddNegotiationNoteDto,
  AwardTenderDto,
  CancelTenderDto,
  CreateContractorTenderDto,
  InviteContractorsDto,
  ListContractorTendersQueryDto,
  RecommendTenderDto,
  RecordBidDto,
} from './dto/contractor-tender.dto';
import { ContractorTendersService } from './contractor-tenders.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'contractor-tender', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Contractor Tenders')
@ApiBearerAuth()
@Controller('contractor-tenders')
export class ContractorTendersController {
  constructor(private readonly service: ContractorTendersService) {}

  @Post()
  @RequirePermissions('tender.manage')
  @ApiOperation({ summary: 'Create contractor tender (draft)' })
  create(
    @Body() dto: CreateContractorTenderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('tender.view')
  @ApiOperation({ summary: 'List contractor tenders' })
  list(
    @Query() query: ListContractorTendersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('tender.view')
  @ApiOperation({ summary: 'Get contractor tender' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getById(id, actor.id);
  }

  @Post(':id/invite')
  @RequirePermissions('tender.manage')
  @ApiOperation({ summary: 'Invite contractors (draft/invited → invited)' })
  invite(
    @Param('id') id: string,
    @Body() dto: InviteContractorsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.invite(id, dto, actor.id);
  }

  @Post(':id/bids')
  @RequirePermissions('tender.manage')
  @ApiOperation({
    summary: 'Record technical/commercial bid (invited/bidding → bidding)',
  })
  recordBid(
    @Param('id') id: string,
    @Body() dto: RecordBidDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.recordBid(id, dto, actor.id);
  }

  @Post(':id/compare')
  @RequirePermissions('tender.view')
  @ApiOperation({
    summary:
      'Compare bids (bidding → under_evaluation); returns comparison matrix',
  })
  compare(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.compare(id, actor.id);
  }

  @Post(':id/recommend')
  @RequirePermissions('tender.manage')
  @ApiOperation({ summary: 'Record award recommendation' })
  recommend(
    @Param('id') id: string,
    @Body() dto: RecommendTenderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.recommend(id, dto, actor.id);
  }

  @Post(':id/award')
  @RequirePermissions('tender.award')
  @ApiOperation({
    summary: 'Award tender (under_evaluation → awarded)',
  })
  award(
    @Param('id') id: string,
    @Body() dto: AwardTenderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.award(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('tender.manage')
  @ApiOperation({ summary: 'Cancel open tender' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTenderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }

  @Post(':id/negotiation-notes')
  @RequirePermissions('tender.manage')
  @ApiOperation({ summary: 'Append negotiation note' })
  addNegotiationNote(
    @Param('id') id: string,
    @Body() dto: AddNegotiationNoteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addNegotiationNote(id, dto, actor.id);
  }
}
