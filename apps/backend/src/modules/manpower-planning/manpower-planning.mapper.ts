import type { Types } from 'mongoose';
import type { ManpowerPlanSource } from './schemas/manpower-plan.schema';
import type {
  ManpowerEscalation,
  ManpowerShortfallAlertType,
} from './schemas/manpower-shortfall-alert.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicManpowerDailyPlan = {
  id: string;
  planNumber: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  planDate: Date;
  plannedHeadcount: number;
  skillMix: Array<{
    id: string;
    labourCategoryId: string | null;
    skill: string;
    plannedHeadcount: number;
    isCritical: boolean;
  }>;
  source: ManpowerPlanSource;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicManpowerShortfallAlert = {
  id: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  agreementNumber: string | null;
  asOfDate: Date;
  alertType: ManpowerShortfallAlertType;
  message: string;
  shortfallPercent: number;
  consecutiveDays: number;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  skillGaps: Array<{
    skill: string;
    committedHeadcount: number;
    plannedHeadcount: number;
    actualHeadcount: number;
    isCritical: boolean;
    missing: boolean;
  }>;
  expectedScheduleImpactDays: number;
  recommendedEscalation: ManpowerEscalation;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicManpowerComparison = {
  projectId: string;
  contractorId: string;
  asOfDate: string;
  agreementId: string | null;
  agreementNumber: string | null;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  shortfallPercent: number;
  fillRatePercent: number;
  attendanceSubmitted: boolean;
  attendanceStatus: string | null;
  skillMix: Array<{
    skill: string;
    committedHeadcount: number;
    plannedHeadcount: number;
    actualHeadcount: number;
    isCritical: boolean;
    missing: boolean;
  }>;
  workProgress: {
    behind: boolean;
    expectedRatio: number;
    actualRatio: number;
    progressShortfallPercent: number;
    expectedScheduleImpactDays: number;
  };
};

type PlanLike = {
  _id: Types.ObjectId | string;
  planNumber: string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  agreementId?: Types.ObjectId | string | null;
  planDate: Date;
  plannedHeadcount: number;
  skillMix?: Array<{
    _id?: Types.ObjectId | string;
    labourCategoryId?: Types.ObjectId | string | null;
    skill: string;
    plannedHeadcount: number;
    isCritical?: boolean;
  }>;
  source: ManpowerPlanSource;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AlertLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  agreementId?: Types.ObjectId | string | null;
  agreementNumber?: string | null;
  asOfDate: Date;
  alertType: ManpowerShortfallAlertType;
  message: string;
  shortfallPercent: number;
  consecutiveDays: number;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  skillGaps?: Array<{
    skill: string;
    committedHeadcount: number;
    plannedHeadcount: number;
    actualHeadcount: number;
    isCritical?: boolean;
    missing?: boolean;
  }>;
  expectedScheduleImpactDays: number;
  recommendedEscalation: ManpowerEscalation;
  acknowledged?: boolean;
  acknowledgedBy?: Types.ObjectId | string | null;
  acknowledgedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicManpowerDailyPlan(
  row: PlanLike,
): PublicManpowerDailyPlan {
  return {
    id: String(row._id),
    planNumber: row.planNumber,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: oid(row.agreementId),
    planDate: row.planDate,
    plannedHeadcount: row.plannedHeadcount,
    skillMix: (row.skillMix ?? []).map((line) => ({
      id: line._id ? String(line._id) : '',
      labourCategoryId: oid(line.labourCategoryId),
      skill: line.skill,
      plannedHeadcount: line.plannedHeadcount,
      isCritical: Boolean(line.isCritical),
    })),
    source: row.source,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicManpowerShortfallAlert(
  row: AlertLike,
): PublicManpowerShortfallAlert {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: oid(row.agreementId),
    agreementNumber: row.agreementNumber ?? null,
    asOfDate: row.asOfDate,
    alertType: row.alertType,
    message: row.message,
    shortfallPercent: row.shortfallPercent,
    consecutiveDays: row.consecutiveDays,
    agreementHeadcount: row.agreementHeadcount,
    plannedHeadcount: row.plannedHeadcount,
    actualHeadcount: row.actualHeadcount,
    skillGaps: (row.skillGaps ?? []).map((gap) => ({
      skill: gap.skill,
      committedHeadcount: gap.committedHeadcount,
      plannedHeadcount: gap.plannedHeadcount,
      actualHeadcount: gap.actualHeadcount,
      isCritical: Boolean(gap.isCritical),
      missing: Boolean(gap.missing),
    })),
    expectedScheduleImpactDays: row.expectedScheduleImpactDays,
    recommendedEscalation: row.recommendedEscalation,
    acknowledged: Boolean(row.acknowledged),
    acknowledgedBy: oid(row.acknowledgedBy),
    acknowledgedAt: row.acknowledgedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
