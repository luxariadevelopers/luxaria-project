import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqItemStatus,
  BoqUnit,
} from '../boq/schemas/boq.schema';
import {
  ContractorAgreement,
  ContractorAgreementBillingCycle,
  ContractorAgreementSchema,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import {
  LabourAttendance,
  LabourAttendanceEntryMode,
  LabourAttendanceSchema,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { ManpowerPlanningService } from './manpower-planning.service';
import {
  ManpowerDailyPlan,
  ManpowerDailyPlanSchema,
  ManpowerPlanSource,
} from './schemas/manpower-plan.schema';
import {
  ManpowerEscalation,
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
  ManpowerShortfallAlertType,
} from './schemas/manpower-shortfall-alert.schema';

describe('ManpowerPlanningService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ManpowerPlanningService;
  let planModel: Model<ManpowerDailyPlan>;
  let alertModel: Model<ManpowerShortfallAlert>;
  let agreementModel: Model<ContractorAgreement>;
  let attendanceModel: Model<LabourAttendance>;
  let boqItemModel: Model<BoqItem>;
  let measurementModel: Model<WorkMeasurement>;

  let actorId: string;
  let projectId: string;
  let contractorId: string;
  let categoryId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    planModel = connection.model(
      ManpowerDailyPlan.name,
      ManpowerDailyPlanSchema,
    ) as Model<ManpowerDailyPlan>;
    alertModel = connection.model(
      ManpowerShortfallAlert.name,
      ManpowerShortfallAlertSchema,
    ) as Model<ManpowerShortfallAlert>;
    agreementModel = connection.model(
      ContractorAgreement.name,
      ContractorAgreementSchema,
    ) as Model<ContractorAgreement>;
    attendanceModel = connection.model(
      LabourAttendance.name,
      LabourAttendanceSchema,
    ) as Model<LabourAttendance>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    boqItemModel = connection.model(
      BoqItem.name,
      BoqItemSchema,
    ) as Model<BoqItem>;
    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      planModel.syncIndexes(),
      alertModel.syncIndexes(),
      agreementModel.syncIndexes(),
      attendanceModel.syncIndexes(),
      projectModel.syncIndexes(),
      contractorModel.syncIndexes(),
      boqItemModel.syncIndexes(),
      measurementModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new ManpowerPlanningService(
      planModel,
      alertModel,
      agreementModel,
      attendanceModel,
      projectModel,
      contractorModel,
      boqItemModel,
      measurementModel,
      new NumberingService(counterModel),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    categoryId = new Types.ObjectId().toHexString();
    await planModel.deleteMany({}).setOptions({ withDeleted: true });
    await alertModel.deleteMany({}).setOptions({ withDeleted: true });
    await agreementModel.deleteMany({}).setOptions({ withDeleted: true });
    await attendanceModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqItemModel.deleteMany({}).setOptions({ withDeleted: true });
    await measurementModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Contractor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-MPL-001',
        projectName: 'Manpower Tower',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectId = String(project._id);

    const [contractor] = await connection.model(Contractor.name).create([
      {
        contractorCode: 'CON-000201',
        legalName: 'Manpower Labour Co',
        contractorType: ContractorType.Labour,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);

    await agreementModel.create({
      agreementNumber: 'CA-2026-000201',
      version: 1,
      contractorId: new Types.ObjectId(contractorId),
      projectId: new Types.ObjectId(projectId),
      workScope: 'Civil labour',
      boqItems: [],
      agreedRatesTotal: 0,
      agreedQuantity: 0,
      manpowerCommitment: 20,
      skillMix: [
        { skill: 'mason', headcount: 12 },
        { skill: 'helper', headcount: 8 },
      ],
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      billingCycle: ContractorAgreementBillingCycle.Monthly,
      advance: { amount: 0, terms: null },
      recoveryPlan: {},
      retentionPercentage: 5,
      status: ContractorAgreementStatus.Active,
    });
  });

  async function seedAttendance(input: {
    date: string;
    masonCount: number;
    helperCount: number;
  }) {
    await attendanceModel.create({
      attendanceNumber: `LAT-${input.date.replace(/-/g, '')}`,
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      attendanceDate: new Date(`${input.date}T00:00:00.000Z`),
      workLocation: 'Block A',
      latitude: 13.08,
      longitude: 80.27,
      lines: [
        {
          labourCategoryId: new Types.ObjectId(categoryId),
          labourCategoryCode: 'LBC-000001',
          labourCategoryName: 'Mason',
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: input.masonCount,
          overtimeHours: 0,
          workers: [],
        },
        {
          labourCategoryId: new Types.ObjectId(),
          labourCategoryCode: 'LBC-000002',
          labourCategoryName: 'Helper',
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: input.helperCount,
          overtimeHours: 0,
          workers: [],
        },
      ],
      groupPhotoDocumentIds: [new Types.ObjectId()],
      status: LabourAttendanceStatus.Submitted,
      submittedBy: new Types.ObjectId(actorId),
      submittedAt: new Date(),
    });
  }

  it('creates daily plan from agreement defaults and compares layers', async () => {
    const created = await service.createPlan(
      {
        projectId,
        contractorId,
        planDate: '2026-07-20',
        useAgreementDefaults: true,
      },
      actorId,
    );

    expect(created.data!.planNumber).toMatch(/^MPL-/);
    expect(created.data!.plannedHeadcount).toBe(20);
    expect(created.data!.source).toBe(ManpowerPlanSource.AgreementDefault);
    expect(created.data!.skillMix).toHaveLength(2);

    await seedAttendance({ date: '2026-07-20', masonCount: 10, helperCount: 4 });

    const comparison = await service.compare({
      projectId,
      contractorId,
      asOfDate: '2026-07-20',
    });

    expect(comparison.data!.agreementHeadcount).toBe(20);
    expect(comparison.data!.plannedHeadcount).toBe(20);
    expect(comparison.data!.actualHeadcount).toBe(14);
    expect(comparison.data!.shortfallPercent).toBe(30);
    expect(comparison.data!.attendanceSubmitted).toBe(true);
    expect(comparison.data!.skillMix.some((s) => s.skill === 'mason')).toBe(
      true,
    );
  });

  it('evaluates shortfall alerts for consecutive understaffing and missing skill', async () => {
    for (const date of ['2026-07-18', '2026-07-19', '2026-07-20']) {
      await service.createPlan(
        {
          projectId,
          contractorId,
          planDate: date,
          plannedHeadcount: 20,
          skillMix: [
            {
              skill: 'mason',
              plannedHeadcount: 12,
              isCritical: true,
            },
            {
              skill: 'helper',
              plannedHeadcount: 8,
              isCritical: false,
            },
          ],
        },
        actorId,
      );
    }

    // 70% for two days, then missing mason on day 3 with still 70% fill
    await seedAttendance({ date: '2026-07-18', masonCount: 10, helperCount: 4 });
    await seedAttendance({ date: '2026-07-19', masonCount: 10, helperCount: 4 });
    await seedAttendance({ date: '2026-07-20', masonCount: 0, helperCount: 14 });

    const result = await service.evaluateShortfallAlerts({
      asOf: '2026-07-20',
      projectId,
      contractorId,
    });

    const types = result.data!.alerts.map((a) => a.alertType);
    expect(types).toContain(
      ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
    );
    expect(types).toContain(ManpowerShortfallAlertType.MissingCriticalSkill);

    const below80 = result.data!.alerts.find(
      (a) =>
        a.alertType === ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
    )!;
    expect(below80.shortfallPercent).toBe(30);
    expect(below80.consecutiveDays).toBeGreaterThanOrEqual(2);
    expect(below80.expectedScheduleImpactDays).toBeGreaterThan(0);
    expect(below80.recommendedEscalation).toBe(
      ManpowerEscalation.SiteSupervisor,
    );

    const ack = await service.acknowledgeShortfallAlert(below80.id, actorId);
    expect(ack.data!.acknowledged).toBe(true);
  });

  it('alerts when attendance is missing and when work progress is behind plan', async () => {
    await service.createPlan(
      {
        projectId,
        contractorId,
        planDate: '2026-07-21',
        useAgreementDefaults: true,
      },
      actorId,
    );

    const missing = await service.evaluateShortfallAlerts({
      asOf: '2026-07-21',
      projectId,
      contractorId,
    });
    expect(missing.data!.alerts.map((a) => a.alertType)).toContain(
      ManpowerShortfallAlertType.NoAttendanceSubmitted,
    );

    const boqItem = await boqItemModel.create({
      projectId: new Types.ObjectId(projectId),
      versionId: new Types.ObjectId(),
      blockId: new Types.ObjectId(),
      floorId: new Types.ObjectId(),
      workCategoryId: new Types.ObjectId(),
      boqCode: 'BOQ-MPL-01',
      description: 'Blockwork',
      unit: BoqUnit.SquareMetre,
      plannedQuantity: 100,
      materialCost: 100,
      labourCost: 100,
      subcontractCost: 0,
      otherCost: 0,
      plannedRate: 200,
      plannedValue: 20000,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-20T00:00:00.000Z'),
      status: BoqItemStatus.Active,
    });

    await measurementModel.create({
      measurementNumber: 'WM-2026-000001',
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      boqItemId: boqItem._id,
      boqCode: 'BOQ-MPL-01',
      location: 'Block A',
      measurementDate: new Date('2026-07-11T00:00:00.000Z'),
      previousQuantity: 0,
      currentQuantity: 15,
      cumulativeQuantity: 15,
      unit: BoqUnit.SquareMetre,
      measuredBy: new Types.ObjectId(actorId),
      status: WorkMeasurementStatus.Submitted,
      submittedBy: new Types.ObjectId(actorId),
      submittedAt: new Date(),
      boqPlannedQuantity: 100,
    });

    await seedAttendance({ date: '2026-07-11', masonCount: 12, helperCount: 8 });
    await service.createPlan(
      {
        projectId,
        contractorId,
        planDate: '2026-07-11',
        useAgreementDefaults: true,
      },
      actorId,
    );

    const behind = await service.evaluateShortfallAlerts({
      asOf: '2026-07-11',
      projectId,
      contractorId,
    });
    expect(behind.data!.alerts.map((a) => a.alertType)).toContain(
      ManpowerShortfallAlertType.WorkProgressBehindPlan,
    );

    const progressAlert = behind.data!.alerts.find(
      (a) => a.alertType === ManpowerShortfallAlertType.WorkProgressBehindPlan,
    )!;
    expect(progressAlert.expectedScheduleImpactDays).toBeGreaterThan(0);
    expect(progressAlert.recommendedEscalation).toBe(
      ManpowerEscalation.ProjectManager,
    );
  });
});
