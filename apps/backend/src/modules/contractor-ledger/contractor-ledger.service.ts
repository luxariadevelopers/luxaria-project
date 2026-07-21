import { Injectable } from '@nestjs/common';
import { AccountingReportType } from '../accounting-reports/accounting-reports.constants';
import { AccountingReportsService } from '../accounting-reports/accounting-reports.service';
import type { AccountingReportsQueryDto } from '../accounting-reports/dto/accounting-reports-query.dto';

/**
 * Thin contractor-facing wrapper over accounting-reports `contractor-ledger`.
 * Keeps journal party-ledger immutable; no parallel sub-ledger store.
 */
@Injectable()
export class ContractorLedgerService {
  constructor(private readonly accountingReports: AccountingReportsService) {}

  getLedger(query: AccountingReportsQueryDto, actorId: string) {
    return this.accountingReports.getReport(
      AccountingReportType.ContractorLedger,
      query,
      actorId,
    );
  }
}
