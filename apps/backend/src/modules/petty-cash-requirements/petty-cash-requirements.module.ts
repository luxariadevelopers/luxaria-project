import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsModule } from '../approvals/approvals.module';
import { CashAccountsModule } from '../cash-accounts/cash-accounts.module';
import { RbacModule } from '../rbac/rbac.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PettyCashRequirementsController } from './petty-cash-requirements.controller';
import { PettyCashRequirementsSeedService } from './petty-cash-requirements.seed.service';
import { PettyCashRequirementsService } from './petty-cash-requirements.service';
import {
  PettyCashExpenseDraft,
  PettyCashExpenseDraftSchema,
} from './schemas/petty-cash-expense-draft.schema';
import {
  PettyCashRequirement,
  PettyCashRequirementSchema,
} from './schemas/petty-cash-requirement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PettyCashRequirement.name, schema: PettyCashRequirementSchema },
      { name: PettyCashExpenseDraft.name, schema: PettyCashExpenseDraftSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CashAccountsModule,
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [PettyCashRequirementsController],
  providers: [PettyCashRequirementsService, PettyCashRequirementsSeedService],
  exports: [PettyCashRequirementsService, MongooseModule],
})
export class PettyCashRequirementsModule {}
