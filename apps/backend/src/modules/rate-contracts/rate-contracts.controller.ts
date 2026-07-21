import {
  Body,
  Controller,
  Delete,
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
  CreateRateContractDto,
  ListRateContractsQueryDto,
  SupersedeRateContractDto,
  TerminateRateContractDto,
  UpdateRateContractDto,
} from './dto/rate-contract.dto';
import { RateContractsService } from './rate-contracts.service';

@GlobalScope()
@ApiTags('Rate Contracts')
@ApiBearerAuth()
@Controller('rate-contracts')
export class RateContractsController {
  constructor(private readonly service: RateContractsService) {}

  @Post()
  @RequirePermissions('rate_contract.manage')
  @ApiOperation({ summary: 'Create rate contract (draft)' })
  create(
    @Body() dto: CreateRateContractDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('rate_contract.view')
  @ApiOperation({ summary: 'List rate contracts' })
  list(@Query() query: ListRateContractsQueryDto) {
    return this.service.list(query);
  }

  @Get('by-contractor/:contractorId')
  @RequirePermissions('rate_contract.view')
  @ApiOperation({ summary: 'List rate contracts for a contractor' })
  listByContractor(
    @Param('contractorId') contractorId: string,
    @Query() query: ListRateContractsQueryDto,
  ) {
    return this.service.listByContractor(contractorId, query);
  }

  @Get('by-project/:projectId')
  @RequirePermissions('rate_contract.view')
  @ApiOperation({ summary: 'List rate contracts for a project' })
  listByProject(
    @Param('projectId') projectId: string,
    @Query() query: ListRateContractsQueryDto,
  ) {
    return this.service.listByProject(projectId, query);
  }

  @Get(':id')
  @RequirePermissions('rate_contract.view')
  @ApiOperation({ summary: 'Get rate contract' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('rate_contract.manage')
  @ApiOperation({ summary: 'Update draft rate contract' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRateContractDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('rate_contract.approve')
  @ApiOperation({ summary: 'Activate draft rate contract' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/supersede')
  @RequirePermissions('rate_contract.manage')
  @ApiOperation({
    summary:
      'Supersede active rate contract (creates next draft version; activate to cut over)',
  })
  supersede(
    @Param('id') id: string,
    @Body() dto: SupersedeRateContractDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.supersede(id, dto, actor.id);
  }

  @Post(':id/terminate')
  @RequirePermissions('rate_contract.manage')
  @ApiOperation({ summary: 'Terminate an active rate contract' })
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateRateContractDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.terminate(id, dto, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('rate_contract.manage')
  @ApiOperation({ summary: 'Soft-delete a draft rate contract' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }
}
