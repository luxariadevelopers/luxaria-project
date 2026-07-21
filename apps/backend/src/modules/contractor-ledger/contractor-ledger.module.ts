import { Module } from '@nestjs/common';
import { AccountingReportsModule } from '../accounting-reports/accounting-reports.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { ContractorLedgerController } from './contractor-ledger.controller';
import { ContractorLedgerService } from './contractor-ledger.service';

@Module({
  imports: [AccountingReportsModule, ProjectAccessModule, RbacModule],
  controllers: [ContractorLedgerController],
  providers: [ContractorLedgerService],
  exports: [ContractorLedgerService],
})
export class ContractorLedgerModule {}
