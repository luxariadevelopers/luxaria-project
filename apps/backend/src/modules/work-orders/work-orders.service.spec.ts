import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoqUnit } from '../boq/schemas/boq.schema';
import {
  WorkOrderAmendmentStatus,
  WorkOrderAmendmentType,
} from './schemas/work-order-amendment.schema';
import {
  WorkOrderResponsibility,
  WorkOrderStatus,
} from './schemas/work-order.schema';
import { WorkOrdersService } from './work-orders.service';

const PROJECT_ID = '507f1f77bcf86cd799439011';
const CONTRACTOR_ID = '507f1f77bcf86cd799439012';
const ACTOR_ID = '507f1f77bcf86cd799439013';
const WO_ID = '507f1f77bcf86cd799439014';
const AMD_ID = '507f1f77bcf86cd799439015';

function boqLine(overrides?: Partial<{ quantity: number; rate: number }>) {
  const quantity = overrides?.quantity ?? 10;
  const rate = overrides?.rate ?? 100;
  return {
    boqItemId: null,
    boqCode: 'RCC-001',
    description: 'RCC columns',
    unit: BoqUnit.CubicMetre,
    quantity,
    rate,
    value: quantity * rate,
  };
}

function approvedWorkOrder(overrides?: {
  contractValue?: number;
  revisions?: unknown[];
  activeRevision?: number;
  status?: WorkOrderStatus;
  boqScopeLines?: ReturnType<typeof boqLine>[];
}) {
  const boqScopeLines = overrides?.boqScopeLines ?? [boqLine()];
  const contractValue =
    overrides?.contractValue ??
    boqScopeLines.reduce((s, l) => s + l.value, 0);
  const revision1 = {
    _id: new Types.ObjectId(),
    revision: 1,
    amendmentId: null,
    boqScopeLines: boqScopeLines.map((l) => ({ ...l })),
    locations: ['Block A'],
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-01'),
    milestones: [],
    paymentTerms: {
      description: null,
      advancePercent: null,
      billingCycle: null,
    },
    retention: { percentage: 5, notes: null },
    recoveries: [],
    materialResponsibility: WorkOrderResponsibility.Company,
    labourResponsibility: WorkOrderResponsibility.Contractor,
    drawingIds: [],
    terms: 'Original terms',
    attachments: [],
    contractValue,
    frozenBy: new Types.ObjectId(ACTOR_ID),
    frozenAt: new Date('2026-07-01'),
  };

  return {
    _id: new Types.ObjectId(WO_ID),
    workOrderNumber: 'WO-2026-000001',
    activeRevision: overrides?.activeRevision ?? 1,
    projectId: new Types.ObjectId(PROJECT_ID),
    siteId: null,
    contractorId: new Types.ObjectId(CONTRACTOR_ID),
    rateContractId: null,
    agreementId: null,
    boqScopeLines: boqScopeLines.map((l) => ({ ...l })),
    locations: ['Block A'],
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-01'),
    milestones: [],
    paymentTerms: {
      description: null,
      advancePercent: null,
      billingCycle: null,
    },
    retention: { percentage: 5, notes: null },
    recoveries: [],
    materialResponsibility: WorkOrderResponsibility.Company,
    labourResponsibility: WorkOrderResponsibility.Contractor,
    drawingIds: [],
    terms: 'Original terms',
    attachments: [],
    contractValue,
    revisions: overrides?.revisions ?? [revision1],
    status: overrides?.status ?? WorkOrderStatus.Issued,
    notes: null,
    save: jest.fn().mockResolvedValue(undefined),
    set: jest.fn(),
  };
}

describe('WorkOrdersService — amendment immutability', () => {
  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  function buildService(opts: {
    workOrder?: ReturnType<typeof approvedWorkOrder>;
    amendment?: Record<string, unknown>;
    amendmentCreate?: jest.Mock;
    amendmentFindOne?: jest.Mock;
  }) {
    const wo = opts.workOrder ?? approvedWorkOrder();
    const workOrderModel = {
      create: jest.fn(),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(wo),
      }),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(0),
      }),
    };

    const amendmentDoc = opts.amendment ?? null;
    const amendmentModel = {
      create: opts.amendmentCreate ?? jest.fn(),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(amendmentDoc),
      }),
      findOne:
        opts.amendmentFindOne ??
        jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(0),
      }),
    };

    const service = new WorkOrdersService(
      workOrderModel as never,
      amendmentModel as never,
      siteAccessService as never,
    );
    return { service, workOrderModel, amendmentModel, wo };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects direct commercial update once work order is approved', async () => {
    const { service } = buildService({
      workOrder: approvedWorkOrder({ status: WorkOrderStatus.Approved }),
    });

    await expect(
      service.update(
        WO_ID,
        {
          boqScopeLines: [
            {
              description: 'Tampered',
              unit: BoqUnit.CubicMetre,
              quantity: 99,
              rate: 1,
            },
          ],
        },
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createAmendment leaves active commercial snapshot unchanged', async () => {
    const wo = approvedWorkOrder({
      contractValue: 1000,
      boqScopeLines: [boqLine({ quantity: 10, rate: 100 })],
    });
    const originalValue = wo.contractValue;
    const originalQty = wo.boqScopeLines[0]!.quantity;

    const created = {
      _id: new Types.ObjectId(AMD_ID),
      amendmentNumber: 'WOA-WO-2026-000001-0001',
      workOrderId: wo._id,
      projectId: wo.projectId,
      targetRevision: 2,
      baseRevision: 1,
      type: WorkOrderAmendmentType.Quantity,
      status: WorkOrderAmendmentStatus.Draft,
      reason: 'Extra qty',
      proposed: {
        boqScopeLines: [boqLine({ quantity: 15, rate: 100 })],
        locations: wo.locations,
        startDate: wo.startDate,
        endDate: wo.endDate,
        milestones: [],
        paymentTerms: wo.paymentTerms,
        retention: wo.retention,
        recoveries: [],
        materialResponsibility: wo.materialResponsibility,
        labourResponsibility: wo.labourResponsibility,
        drawingIds: [],
        terms: wo.terms,
        attachments: [],
        contractValue: 1500,
      },
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      submittedBy: null,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };

    const amendmentCreate = jest.fn().mockResolvedValue(created);
    const { service } = buildService({
      workOrder: wo,
      amendmentCreate,
    });

    const res = await service.createAmendment(
      WO_ID,
      {
        type: WorkOrderAmendmentType.Quantity,
        reason: 'Extra qty',
        boqScopeLines: [
          {
            description: 'RCC columns',
            unit: BoqUnit.CubicMetre,
            quantity: 15,
            rate: 100,
          },
        ],
      },
      ACTOR_ID,
    );

    expect(res.data?.status).toBe(WorkOrderAmendmentStatus.PendingApproval);
    expect(res.data?.targetRevision).toBe(2);
    // Active WO commercial must not be silently rewritten.
    expect(wo.contractValue).toBe(originalValue);
    expect(wo.boqScopeLines[0]!.quantity).toBe(originalQty);
    expect(wo.activeRevision).toBe(1);
    expect(wo.save).not.toHaveBeenCalled();
  });

  it('approveAmendment appends revision and preserves prior frozen snapshot', async () => {
    const wo = approvedWorkOrder({
      contractValue: 1000,
      boqScopeLines: [boqLine({ quantity: 10, rate: 100 })],
    });
    const priorRevision = wo.revisions[0]!;
    const priorFrozen = {
      revision: priorRevision.revision,
      contractValue: priorRevision.contractValue,
      terms: priorRevision.terms,
      quantity: priorRevision.boqScopeLines[0]!.quantity,
      rate: priorRevision.boqScopeLines[0]!.rate,
    };

    const amendment = {
      _id: new Types.ObjectId(AMD_ID),
      amendmentNumber: 'WOA-WO-2026-000001-0001',
      workOrderId: wo._id,
      projectId: wo.projectId,
      targetRevision: 2,
      baseRevision: 1,
      type: WorkOrderAmendmentType.Rate,
      status: WorkOrderAmendmentStatus.PendingApproval,
      reason: 'Rate revision',
      proposed: {
        boqScopeLines: [boqLine({ quantity: 10, rate: 120 })],
        locations: ['Block A'],
        startDate: wo.startDate,
        endDate: wo.endDate,
        milestones: [],
        paymentTerms: wo.paymentTerms,
        retention: wo.retention,
        recoveries: [],
        materialResponsibility: wo.materialResponsibility,
        labourResponsibility: wo.labourResponsibility,
        drawingIds: [],
        terms: 'Revised terms',
        attachments: [],
        contractValue: 1200,
      },
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      submittedBy: null,
      submittedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };

    const { service } = buildService({ workOrder: wo, amendment });

    const res = await service.approveAmendment(AMD_ID, ACTOR_ID);

    expect(res.data?.workOrder.activeRevision).toBe(2);
    expect(res.data?.workOrder.contractValue).toBe(1200);
    expect(res.data?.amendment.status).toBe(WorkOrderAmendmentStatus.Approved);

    // Full revision history retained — prior snapshot untouched.
    expect(wo.revisions).toHaveLength(2);
    expect(wo.revisions[0]!.revision).toBe(priorFrozen.revision);
    expect(wo.revisions[0]!.contractValue).toBe(priorFrozen.contractValue);
    expect(wo.revisions[0]!.terms).toBe(priorFrozen.terms);
    expect(wo.revisions[0]!.boqScopeLines[0]!.quantity).toBe(
      priorFrozen.quantity,
    );
    expect(wo.revisions[0]!.boqScopeLines[0]!.rate).toBe(priorFrozen.rate);
    expect(wo.revisions[1]!.revision).toBe(2);
    expect(wo.revisions[1]!.contractValue).toBe(1200);
    expect(String(wo.revisions[1]!.amendmentId)).toBe(AMD_ID);
  });

  it('approveAmendment rejects when base revision no longer matches', async () => {
    const wo = approvedWorkOrder({ activeRevision: 2 });
    // Simulate WO already advanced past amendment base.
    wo.revisions.push({
      ...wo.revisions[0]!,
      _id: new Types.ObjectId(),
      revision: 2,
      contractValue: 1100,
    });

    const amendment = {
      _id: new Types.ObjectId(AMD_ID),
      workOrderId: wo._id,
      projectId: wo.projectId,
      targetRevision: 2,
      baseRevision: 1,
      status: WorkOrderAmendmentStatus.PendingApproval,
      proposed: {
        boqScopeLines: [boqLine({ quantity: 10, rate: 120 })],
        locations: [],
        startDate: wo.startDate,
        endDate: wo.endDate,
        milestones: [],
        paymentTerms: wo.paymentTerms,
        retention: wo.retention,
        recoveries: [],
        materialResponsibility: wo.materialResponsibility,
        labourResponsibility: wo.labourResponsibility,
        drawingIds: [],
        terms: null,
        attachments: [],
        contractValue: 1200,
      },
      save: jest.fn(),
      set: jest.fn(),
    };

    const { service } = buildService({ workOrder: wo, amendment });

    await expect(
      service.approveAmendment(AMD_ID, ACTOR_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(wo.save).not.toHaveBeenCalled();
  });

  it('rejects createAmendment when an open amendment already exists', async () => {
    const { service } = buildService({
      amendmentFindOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: AMD_ID }),
      }),
    });

    await expect(
      service.createAmendment(
        WO_ID,
        {
          type: WorkOrderAmendmentType.Scope,
          reason: 'Duplicate',
        },
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('approve freezes revision 1 without wiping commercial fields', async () => {
    const wo = approvedWorkOrder({
      status: WorkOrderStatus.PendingApproval,
      activeRevision: 0,
      revisions: [],
    });
    const { service } = buildService({ workOrder: wo });

    const res = await service.approve(WO_ID, ACTOR_ID);

    expect(res.data?.status).toBe(WorkOrderStatus.Approved);
    expect(res.data?.activeRevision).toBe(1);
    expect(wo.revisions).toHaveLength(1);
    expect(wo.revisions[0]!.contractValue).toBe(wo.contractValue);
    expect(wo.boqScopeLines[0]!.quantity).toBe(10);
  });
});
