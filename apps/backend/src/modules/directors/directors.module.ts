import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import { CompanyModule } from '../company/company.module';
import { CompanyBankAccountsModule } from '../company-bank-accounts/company-bank-accounts.module';
import { JournalModule } from '../journal/journal.module';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { DirectorsController } from './directors.controller';
import { DirectorsSeedService } from './directors.seed.service';
import { DirectorsService } from './directors.service';
import { ShareholdingService } from './shareholding.service';
import {
  CompanyShareholding,
  CompanyShareholdingSchema,
} from './schemas/company-shareholding.schema';
import {
  DirectorFile,
  DirectorFileSchema,
} from './schemas/director-document.schema';
import { Director, DirectorSchema } from './schemas/director.schema';
import {
  ShareholdingChangeRequest,
  ShareholdingChangeRequestSchema,
} from './schemas/shareholding-change-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Director.name, schema: DirectorSchema },
      { name: DirectorFile.name, schema: DirectorFileSchema },
      { name: CompanyShareholding.name, schema: CompanyShareholdingSchema },
      {
        name: ShareholdingChangeRequest.name,
        schema: ShareholdingChangeRequestSchema,
      },
      { name: Account.name, schema: AccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
    ]),
    CompanyModule,
    CompanyBankAccountsModule,
    JournalModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RbacModule),
  ],
  controllers: [DirectorsController],
  providers: [DirectorsService, ShareholdingService, DirectorsSeedService],
  exports: [DirectorsService, ShareholdingService, MongooseModule],
})
export class DirectorsModule {}
