import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import {
  Booking,
  BookingSchema,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import { CustomerFundingType } from '../customers/schemas/customer.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { PaymentSchedulesService } from './payment-schedules.service';
import {
  PaymentDemand,
  PaymentDemandSchema,
  PaymentDemandStatus,
} from './schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleSchema,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from './schemas/payment-schedule.schema';

describe('PaymentSchedulesService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: PaymentSchedulesService;
  let scheduleModel: Model<PaymentSchedule>;
  let bookingModel: Model<Booking>;

  let actorId: string;
  let bookingId: string;
  let projectId: Types.ObjectId;
  let customerId: Types.ObjectId;
  let unitId: Types.ObjectId;

  const lines = [
    {
      sequence: 1,
      milestone: 'On booking',
      dueDate: '2026-08-01',
      percentage: 20,
      amount: 1_600_000,
      tax: 80_000,
    },
    {
      sequence: 2,
      milestone: 'On agreement',
      dueDate: '2026-10-01',
      percentage: 30,
      amount: 2_400_000,
      tax: 120_000,
    },
    {
      sequence: 3,
      milestone: 'On possession',
      dueDate: '2027-01-01',
      percentage: 50,
      amount: 4_000_000,
      tax: 200_000,
    },
  ];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    scheduleModel = connection.model(
      PaymentSchedule.name,
      PaymentScheduleSchema,
    ) as Model<PaymentSchedule>;
    const demandModel = connection.model(
      PaymentDemand.name,
      PaymentDemandSchema,
    ) as Model<PaymentDemand>;
    bookingModel = connection.model(
      Booking.name,
      BookingSchema,
    ) as Model<Booking>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      scheduleModel.syncIndexes(),
      demandModel.syncIndexes(),
      bookingModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const approvalsService = {
      create: async () => ({
        data: { id: new Types.ObjectId().toHexString(), status: 'pending' },
      }),
      approve: async () => ({
        data: { status: ApprovalStatus.Approved },
      }),
      reject: async () => ({
        data: { status: ApprovalStatus.Rejected },
      }),
    } as unknown as ApprovalsService;

    service = new PaymentSchedulesService(
      scheduleModel,
      demandModel,
      bookingModel,
      numbering,
      approvalsService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId();
    customerId = new Types.ObjectId();
    unitId = new Types.ObjectId();

    await scheduleModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(PaymentDemand.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await bookingModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [booking] = await bookingModel.create([
      {
        bookingNumber: 'BK-2026-000001',
        customerId,
        projectId,
        unitId,
        bookingDate: new Date('2026-07-01'),
        bookingAmount: 200_000,
        agreedPrice: 8_000_000,
        discount: 0,
        approvedPrice: 8_000_000,
        fundingType: CustomerFundingType.OwnFunds,
        status: BookingStatus.Booked,
        paymentPlan: { name: null, installments: [] },
        broker: {},
      },
    ]);
    bookingId = String(booking._id);
  });

  async function generateAndActivate(
    scheduleType: PaymentScheduleType = PaymentScheduleType.DateBased,
    lineOverrides = lines,
  ) {
    const generated = await service.generate(
      {
        bookingId,
        scheduleType,
        lines: lineOverrides,
        submit: true,
      },
      actorId,
    );
    expect(generated.data!.status).toBe(PaymentScheduleStatus.PendingApproval);

    const approved = await service.approve(
      generated.data!.id,
      { comment: 'OK' },
      actorId,
    );
    expect(approved.data!.status).toBe(PaymentScheduleStatus.Active);
    return approved.data!;
  }

  it('generates a PS schedule from booking with line fields', async () => {
    const created = await service.generate(
      {
        bookingId,
        scheduleType: PaymentScheduleType.DateBased,
        lines,
      },
      actorId,
    );

    expect(created.data!.scheduleNumber).toMatch(/^PS-/);
    expect(created.data!.bookingId).toBe(bookingId);
    expect(created.data!.totalAmount).toBe(8_000_000);
    expect(created.data!.lines).toHaveLength(3);
    expect(created.data!.lines[0]?.milestone).toBe('On booking');
    expect(created.data!.lines[0]?.percentage).toBe(20);
    expect(created.data!.lines[0]?.tax).toBe(80_000);
    expect(created.data!.status).toBe(PaymentScheduleStatus.Draft);
  });

  it('rejects generate when booking is not booked+', async () => {
    await bookingModel.findByIdAndUpdate(bookingId, {
      status: BookingStatus.Hold,
    });
    await expect(
      service.generate(
        {
          bookingId,
          scheduleType: PaymentScheduleType.Custom,
          lines,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revises active schedule with approval and supersedes prior', async () => {
    const active = await generateAndActivate();

    const revisedLines = [
      {
        sequence: 1,
        milestone: 'Token',
        dueDate: '2026-08-15',
        percentage: 25,
        amount: 2_000_000,
        tax: 100_000,
      },
      {
        sequence: 2,
        milestone: 'Balance',
        dueDate: '2027-02-01',
        percentage: 75,
        amount: 6_000_000,
        tax: 300_000,
      },
    ];

    const revised = await service.revise(
      active.id,
      { lines: revisedLines, submit: true },
      actorId,
    );
    expect(revised.data!.revisionNumber).toBe(2);
    expect(revised.data!.status).toBe(PaymentScheduleStatus.PendingApproval);
    expect(revised.data!.revisedFromId).toBe(active.id);

    // prior still active until revision approved
    const prior = await service.getById(active.id);
    expect(prior.data!.status).toBe(PaymentScheduleStatus.Active);

    const approvedRevision = await service.approve(
      revised.data!.id,
      {},
      actorId,
    );
    expect(approvedRevision.data!.status).toBe(PaymentScheduleStatus.Active);

    const superseded = await service.getById(active.id);
    expect(superseded.data!.status).toBe(PaymentScheduleStatus.Superseded);
  });

  it('marks line due, generates demand, and tracks overdue', async () => {
    const active = await generateAndActivate(
      PaymentScheduleType.ConstructionMilestone,
      [
        {
          sequence: 1,
          milestone: 'Foundation',
          dueDate: '2026-08-01',
          percentage: 40,
          amount: 3_200_000,
          tax: 160_000,
        },
        {
          sequence: 2,
          milestone: 'Roof',
          dueDate: '2026-10-01',
          percentage: 60,
          amount: 4_800_000,
          tax: 240_000,
        },
      ],
    );

    const lineId = active.lines[0]!.id;

    await expect(
      service.generateDemand(
        active.id,
        { lineId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const due = await service.markDue(
      active.id,
      { lineId, dueDate: '2020-01-01' },
      actorId,
    );
    expect(due.data!.lines[0]!.status).toBe(PaymentScheduleLineStatus.Overdue);

    // reset to due with future date for demand path
    await scheduleModel.updateOne(
      { _id: active.id, 'lines._id': new Types.ObjectId(lineId) },
      {
        $set: {
          'lines.$.status': PaymentScheduleLineStatus.Due,
          'lines.$.dueDate': new Date('2026-09-01'),
          'lines.$.overdueAt': null,
        },
      },
    );

    const demandResult = await service.generateDemand(
      active.id,
      { lineId },
      actorId,
    );
    expect(demandResult.data!.demand.demandNumber).toMatch(/^DM-/);
    expect(demandResult.data!.demand.status).toBe(PaymentDemandStatus.Issued);
    expect(demandResult.data!.schedule.lines[0]!.status).toBe(
      PaymentScheduleLineStatus.Demanded,
    );
    expect(demandResult.data!.schedule.lines[0]!.demandId).toBeTruthy();

    await expect(
      service.generateDemand(active.id, { lineId }, actorId),
    ).rejects.toBeInstanceOf(ConflictException);

    // force overdue via job
    await scheduleModel.updateOne(
      { _id: active.id, 'lines._id': new Types.ObjectId(lineId) },
      {
        $set: {
          'lines.$.status': PaymentScheduleLineStatus.Demanded,
          'lines.$.dueDate': new Date('2020-06-01'),
        },
      },
    );

    const overdueJob = await service.markOverdue();
    expect(overdueJob.data!.marked).toBeGreaterThanOrEqual(1);

    const overdueList = await service.listOverdue({});
    expect(overdueList.data!.length).toBeGreaterThanOrEqual(1);
    expect(overdueList.data![0]?.line.status).toBe(
      PaymentScheduleLineStatus.Overdue,
    );
  });

  it('supports bank_disbursement schedule type', async () => {
    const created = await service.generate(
      {
        bookingId,
        scheduleType: PaymentScheduleType.BankDisbursement,
        lines: [
          {
            sequence: 1,
            milestone: 'Bank tranche 1',
            percentage: 50,
            amount: 4_000_000,
          },
          {
            sequence: 2,
            milestone: 'Bank tranche 2',
            percentage: 50,
            amount: 4_000_000,
          },
        ],
      },
      actorId,
    );
    expect(created.data!.scheduleType).toBe(
      PaymentScheduleType.BankDisbursement,
    );
  });

  it('blocks second active/draft schedule for same booking', async () => {
    await service.generate(
      {
        bookingId,
        scheduleType: PaymentScheduleType.Custom,
        lines,
      },
      actorId,
    );
    await expect(
      service.generate(
        {
          bookingId,
          scheduleType: PaymentScheduleType.Custom,
          lines,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
