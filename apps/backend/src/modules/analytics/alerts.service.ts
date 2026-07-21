import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { Company } from '../company/schemas/company.schema';
import { DirectorCommandCentreService } from '../director-command-centre/director-command-centre.service';
import type { ListAlertsQueryDto } from './dto/analytics-query.dto';
import {
  AnalyticsAlert,
  AnalyticsAlertCode,
  AnalyticsAlertSeverity,
  AnalyticsAlertStatus,
} from './schemas/analytics-alert.schema';

@Injectable()
export class AnalyticsAlertsService {
  constructor(
    @InjectModel(AnalyticsAlert.name)
    private readonly alertModel: Model<AnalyticsAlert>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
    private readonly commandCentre: DirectorCommandCentreService,
  ) {}

  async list(query: ListAlertsQueryDto, actorId: string) {
    await this.refreshFromCommandCentre(actorId, query.projectId);
    const company = await this.requirePrimaryCompany();
    const filter: FilterQuery<AnalyticsAlert> = { companyId: company._id };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.code) filter.code = query.code;

    const rows = await this.alertModel
      .find(filter)
      .sort({ severity: 1, detectedAt: -1 })
      .limit(query.limit ?? 100)
      .lean()
      .exec();

    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        projectId: row.projectId ? String(row.projectId) : null,
        code: row.code,
        severity: row.severity,
        status: row.status,
        title: row.title,
        message: row.message,
        context: row.context ?? null,
        drillPath: row.drillPath ?? [],
        sourceHref: row.sourceHref ?? null,
        detectedAt: row.detectedAt.toISOString(),
        acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      })),
      'Risk alerts',
    );
  }

  async acknowledge(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Alert not found');
    }
    const updated = await this.alertModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: AnalyticsAlertStatus.Open,
        },
        {
          $set: {
            status: AnalyticsAlertStatus.Acknowledged,
            acknowledgedByUserId: new Types.ObjectId(actorId),
            acknowledgedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Open alert not found');
    }
    return createSuccessResponse(
      { id: String(updated._id), status: updated.status },
      'Alert acknowledged',
    );
  }

  /**
   * Materialise command-centre exceptions into the analytics alert store
   * (upsert by company + code + project + open status).
   */
  async refreshFromCommandCentre(actorId: string, projectId?: string) {
    const company = await this.requirePrimaryCompany();
    const summaryRes = await this.commandCentre.getSummary(
      { projectId, date: new Date().toISOString().slice(0, 10) },
      actorId,
    );
    const exceptions = summaryRes.data?.criticalExceptions ?? [];
    const now = new Date();

    for (const ex of exceptions) {
      const code = this.mapExceptionCode(ex.code);
      const severity =
        ex.severity === 'critical'
          ? AnalyticsAlertSeverity.Critical
          : AnalyticsAlertSeverity.Warning;
      const projectOid =
        'projectId' in ex && typeof (ex as { projectId?: string }).projectId === 'string'
          ? new Types.ObjectId((ex as { projectId: string }).projectId)
          : projectId
            ? new Types.ObjectId(projectId)
            : undefined;

      await this.alertModel
        .findOneAndUpdate(
          {
            companyId: company._id,
            code,
            projectId: projectOid,
            status: {
              $in: [
                AnalyticsAlertStatus.Open,
                AnalyticsAlertStatus.Acknowledged,
              ],
            },
          },
          {
            $set: {
              severity,
              title: ex.code.replace(/_/g, ' '),
              message: ex.message,
              context: { count: ex.count },
              drillPath: (ex.drillDown ?? []).map((d) => d.href),
              sourceHref: ex.drillDown?.[0]?.href,
              detectedAt: now,
            },
            $setOnInsert: {
              companyId: company._id,
              projectId: projectOid,
              code,
              status: AnalyticsAlertStatus.Open,
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  private mapExceptionCode(raw: string): AnalyticsAlertCode {
    const key = raw.toLowerCase();
    if (key.includes('dpr')) return AnalyticsAlertCode.DprNotSubmitted;
    if (key.includes('stock') || key.includes('material')) {
      return AnalyticsAlertCode.CriticalMaterialShortage;
    }
    if (key.includes('overdue') || key.includes('collection')) {
      return AnalyticsAlertCode.CollectionDelay;
    }
    if (key.includes('budget')) return AnalyticsAlertCode.BudgetExceeded;
    if (key.includes('approval') || key.includes('purchase_request')) {
      return AnalyticsAlertCode.ApprovalBottleneck;
    }
    if (key.includes('contractor')) {
      return AnalyticsAlertCode.ContractorBillPending;
    }
    if (key.includes('cash')) return AnalyticsAlertCode.CashShortfallExpected;
    return AnalyticsAlertCode.ProjectMilestoneDelayed;
  }

  private async requirePrimaryCompany() {
    const company = await this.companyModel.findOne({ isPrimary: true }).exec();
    if (!company) {
      throw new NotFoundException('Primary company not found');
    }
    return company;
  }
}
