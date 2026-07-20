import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import {
  ApprovalHistory,
  ApprovalHistorySchema,
} from './schemas/approval-history.schema';
import {
  ApprovalRequest,
  ApprovalRequestSchema,
} from './schemas/approval-request.schema';
import {
  ApprovalWorkflow,
  ApprovalWorkflowSchema,
} from './schemas/approval-workflow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApprovalWorkflow.name, schema: ApprovalWorkflowSchema },
      { name: ApprovalRequest.name, schema: ApprovalRequestSchema },
      { name: ApprovalHistory.name, schema: ApprovalHistorySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService, MongooseModule],
})
export class ApprovalsModule {}
