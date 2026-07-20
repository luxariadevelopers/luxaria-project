import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { JournalModule } from '../journal/journal.module';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankStatementImportService } from './bank-statement-import.service';
import {
  BankReconciliationMatch,
  BankReconciliationMatchSchema,
} from './schemas/bank-reconciliation-match.schema';
import {
  BankReconciliationSession,
  BankReconciliationSessionSchema,
} from './schemas/bank-reconciliation-session.schema';
import {
  BankStatementLine,
  BankStatementLineSchema,
} from './schemas/bank-statement-line.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BankReconciliationSession.name,
        schema: BankReconciliationSessionSchema,
      },
      { name: BankStatementLine.name, schema: BankStatementLineSchema },
      {
        name: BankReconciliationMatch.name,
        schema: BankReconciliationMatchSchema,
      },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    JournalModule,
  ],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService, BankStatementImportService],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
