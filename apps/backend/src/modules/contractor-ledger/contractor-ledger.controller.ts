import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AccountingReportsQueryDto } from '../accounting-reports/dto/accounting-reports-query.dto';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ContractorLedgerService } from './contractor-ledger.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Contractor Ledger')
@ApiBearerAuth()
@Controller('contractor-ledger')
export class ContractorLedgerController {
  constructor(private readonly service: ContractorLedgerService) {}

  @Get()
  @RequirePermissions('report.view')
  @ApiOperation({
    summary:
      'Contractor party ledger (wraps GET /accounting-reports/contractor-ledger)',
  })
  getLedger(
    @Query() query: AccountingReportsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.getLedger(query, actor.id);
  }
}
