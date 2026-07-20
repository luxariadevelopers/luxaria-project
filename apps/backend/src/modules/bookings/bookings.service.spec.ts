import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import {
  Customer,
  CustomerFundingType,
  CustomerSchema,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  Unit,
  UnitSchema,
  UnitStatus,
  UnitType,
} from '../units/schemas/unit.schema';
import { UnitsService } from '../units/units.service';
import { BookingPdfService } from './booking-pdf.service';
import { BookingsService } from './bookings.service';
import { Booking, BookingSchema, BookingStatus } from './schemas/booking.schema';

describe('BookingsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: BookingsService;
  let bookingModel: Model<Booking>;
  let unitModel: Model<Unit>;
  let unitsService: UnitsService;

  let actorId: string;
  let projectId: string;
  let customerId: string;
  let unitId: string;
  let approvalCreateCalls: number;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    bookingModel = connection.model(
      Booking.name,
      BookingSchema,
    ) as Model<Booking>;
    unitModel = connection.model(Unit.name, UnitSchema) as Model<Unit>;
    const customerModel = connection.model(
      Customer.name,
      CustomerSchema,
    ) as Model<Customer>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      bookingModel.syncIndexes(),
      unitModel.syncIndexes(),
      customerModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    unitsService = new UnitsService(unitModel, projectModel);
    const numbering = new NumberingService(counterModel);
    const pdfService = new BookingPdfService();

    approvalCreateCalls = 0;
    const approvalsService = {
      create: async () => {
        approvalCreateCalls += 1;
        return {
          data: { id: new Types.ObjectId().toHexString(), status: 'pending' },
        };
      },
      approve: async () => ({
        data: { status: ApprovalStatus.Approved },
      }),
      reject: async () => ({
        data: { status: ApprovalStatus.Rejected },
      }),
    } as unknown as ApprovalsService;

    const configService = {
      get: (key: keyof AppConfig) => {
        const map: Partial<Record<keyof AppConfig, unknown>> = {
          bookingHoldHours: 48,
          bookingDiscountPercentLimit: 5,
          bookingDiscountAmountLimit: 500_000,
          bookingHoldExpiryJobsEnabled: true,
        };
        return map[key];
      },
    } as unknown as ConfigService<AppConfig, true>;
    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;


    service = new BookingsService(
      bookingModel,
      customerModel,
      projectModel,
      unitModel,
      numbering,
      unitsService,
      approvalsService,
      pdfService,
      configService,
      mockProjectScope
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approvalCreateCalls = 0;

    await bookingModel.deleteMany({}).setOptions({ withDeleted: true });
    await unitModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Customer.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-BK-001',
        projectName: 'Harbour Heights',
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

    const [customer] = await connection.model(Customer.name).create([
      {
        customerCode: 'CUS-000001',
        fullName: 'Ravi Kumar',
        pan: 'AAAAA1111A',
        fundingType: CustomerFundingType.OwnFunds,
        status: CustomerStatus.Active,
        jointApplicant: {
          fullName: 'Priya Kumar',
          relationship: 'Spouse',
          pan: 'BBBBB2222B',
        },
        contact: {},
        address: {},
      },
    ]);
    customerId = String(customer._id);

    const unit = await unitsService.create(
      {
        projectId,
        block: 'A',
        floor: '10',
        unitNumber: '1001',
        unitType: UnitType.TwoBhk,
        carpetArea: 900,
        builtUpArea: 1100,
        uds: 350,
        basePrice: 8_000_000,
        additionalCharges: 200_000,
        tax: 400_000,
      },
      actorId,
    );
    unitId = unit.data!.id;
  });

  async function createHoldBooking(
    overrides: Partial<{
      discount: number;
      agreedPrice: number;
      unitId: string;
      jointApplicantId: string | null;
    }> = {},
  ) {
    return service.create(
      {
        customerId,
        projectId,
        unitId: overrides.unitId ?? unitId,
        bookingAmount: 200_000,
        agreedPrice: overrides.agreedPrice ?? 8_000_000,
        discount: overrides.discount ?? 0,
        fundingType: CustomerFundingType.OwnFunds,
        jointApplicantId: overrides.jointApplicantId,
        paymentPlan: {
          name: 'CLP',
          installments: [
            {
              sequence: 1,
              label: 'On booking',
              amount: 200_000,
              percent: 2.5,
            },
          ],
        },
        broker: { name: 'Ace Brokers', phone: '9000000000' },
      },
      actorId,
    );
  }

  it('creates booking on Hold with BK number and claims unit', async () => {
    const created = await createHoldBooking();

    expect(created.data!.bookingNumber).toMatch(/^BK-/);
    expect(created.data!.status).toBe(BookingStatus.Hold);
    expect(created.data!.holdExpiresAt).toBeTruthy();
    expect(created.data!.approvedPrice).toBe(8_000_000);

    const unit = await unitModel.findById(unitId).lean();
    expect(unit?.status).toBe(UnitStatus.Held);
    expect(String(unit?.bookingRefId)).toBe(created.data!.id);
  });

  it('prevents another active booking for the same unit', async () => {
    await createHoldBooking();

    await expect(createHoldBooking()).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires discount approval above limits and blocks reserve until approved', async () => {
    const created = await createHoldBooking({ discount: 600_000 });

    expect(created.data!.status).toBe(BookingStatus.PendingApproval);
    expect(created.data!.discountApprovalRequired).toBe(true);
    expect(created.data!.discountApproved).toBe(false);
    expect(approvalCreateCalls).toBe(1);

    await expect(
      service.transition(
        created.data!.id,
        { status: BookingStatus.Reserved },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const approved = await service.approveDiscount(
      created.data!.id,
      { comment: 'OK' },
      actorId,
    );
    expect(approved.data!.status).toBe(BookingStatus.Hold);
    expect(approved.data!.discountApproved).toBe(true);

    const reserved = await service.transition(
      created.data!.id,
      { status: BookingStatus.Reserved },
      actorId,
    );
    expect(reserved.data!.status).toBe(BookingStatus.Reserved);
  });

  it('follows Hold → Reserved → Booked → Agreement → Registered and generates PDF', async () => {
    const created = await createHoldBooking();

    await service.transition(
      created.data!.id,
      { status: BookingStatus.Reserved },
      actorId,
    );
    const booked = await service.transition(
      created.data!.id,
      { status: BookingStatus.Booked },
      actorId,
    );

    expect(booked.data!.status).toBe(BookingStatus.Booked);
    expect(booked.data!.pdfPath).toMatch(/^uploads\/bookings\//);
    const absolute = join(process.cwd(), booked.data!.pdfPath!);
    expect(existsSync(absolute)).toBe(true);

    await service.transition(
      created.data!.id,
      { status: BookingStatus.Agreement },
      actorId,
    );
    const registered = await service.transition(
      created.data!.id,
      { status: BookingStatus.Registered },
      actorId,
    );
    expect(registered.data!.status).toBe(BookingStatus.Registered);

    const unit = await unitModel.findById(unitId).lean();
    expect(unit?.status).toBe(UnitStatus.Registered);

    unlinkSync(absolute);
  });

  it('expires holds automatically and releases the unit', async () => {
    const created = await createHoldBooking();
    await bookingModel.findByIdAndUpdate(created.data!.id, {
      holdExpiresAt: new Date(Date.now() - 60_000),
    });

    const result = await service.expireHolds(actorId);
    expect(result.data!.expired).toBe(1);

    const booking = await bookingModel.findById(created.data!.id).lean();
    expect(booking?.status).toBe(BookingStatus.Expired);

    const unit = await unitModel.findById(unitId).lean();
    expect(unit?.status).toBe(UnitStatus.Available);
    expect(unit?.bookingRefId).toBeNull();
  });

  it('accepts jointApplicantId when customer has a joint applicant', async () => {
    const jointId = new Types.ObjectId().toHexString();
    const created = await createHoldBooking({ jointApplicantId: jointId });
    expect(created.data!.jointApplicantId).toBe(jointId);
  });

  it('rejects jointApplicantId when customer has no joint applicant', async () => {
    await connection.model(Customer.name).findByIdAndUpdate(customerId, {
      jointApplicant: { fullName: null },
    });
    const jointId = new Types.ObjectId().toHexString();
    await expect(
      createHoldBooking({ jointApplicantId: jointId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
