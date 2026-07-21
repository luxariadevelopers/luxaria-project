import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Customer,
  CustomerFundingType,
  CustomerSchema,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { LeadsService } from './leads.service';
import {
  Lead,
  LeadSchema,
  LeadSource,
  LeadStatus,
} from './schemas/lead.schema';

describe('LeadsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: LeadsService;
  let leadModel: Model<Lead>;
  let customerModel: Model<Customer>;

  let actorId: string;
  let companyId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    leadModel = connection.model(Lead.name, LeadSchema) as Model<Lead>;
    customerModel = connection.model(
      Customer.name,
      CustomerSchema,
    ) as Model<Customer>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      leadModel.syncIndexes(),
      customerModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    service = new LeadsService(leadModel, customerModel, numbering);
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    companyId = new Types.ObjectId().toHexString();

    await leadModel.deleteMany({}).setOptions({ withDeleted: true });
    await customerModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
  });

  async function seedLead(
    overrides: Partial<{
      status: LeadStatus;
      companyId: string | null;
    }> = {},
  ) {
    const res = await service.create(
      {
        companyId: overrides.companyId === null ? null : companyId,
        source: LeadSource.Website,
        contact: {
          fullName: 'Anita Sharma',
          email: 'anita@example.com',
          phone: '9876543210',
        },
        unitPreference: '2bhk',
        budgetMin: 5_000_000,
        budgetMax: 8_000_000,
      },
      actorId,
    );
    const leadId = res.data!.id;
    const target = overrides.status ?? LeadStatus.New;

    const path: LeadStatus[] = [
      LeadStatus.New,
      LeadStatus.Contacted,
      LeadStatus.Qualified,
      LeadStatus.SiteVisit,
      LeadStatus.Proposal,
      LeadStatus.Negotiation,
    ];

    if (target === LeadStatus.Won) {
      for (let i = 1; i < path.length; i += 1) {
        await service.transition(leadId, { status: path[i] }, actorId);
      }
      await service.convert(leadId, {}, actorId);
      return leadId;
    }

    const targetIdx = path.indexOf(target);
    if (targetIdx > 0) {
      for (let i = 1; i <= targetIdx; i += 1) {
        await service.transition(leadId, { status: path[i] }, actorId);
      }
    }

    return leadId;
  }

  it('creates a lead with LD numbering', async () => {
    const res = await service.create(
      {
        companyId,
        source: LeadSource.Referral,
        contact: {
          fullName: 'Ravi Kumar',
          phone: '9000000001',
        },
      },
      actorId,
    );

    expect(res.data?.leadNumber).toMatch(/^LD-\d{4}-\d{6}$/);
    expect(res.data?.status).toBe(LeadStatus.New);
    expect(res.data?.contact.fullName).toBe('Ravi Kumar');
  });

  it('advances status along the happy path', async () => {
    const leadId = await seedLead();

    const res = await service.transition(
      leadId,
      { status: LeadStatus.Contacted },
      actorId,
    );

    expect(res.data?.status).toBe(LeadStatus.Contacted);
  });

  it('rejects invalid status skips', async () => {
    const leadId = await seedLead();

    await expect(
      service.transition(leadId, { status: LeadStatus.Qualified }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convert locks update path after won', async () => {
    const leadId = await seedLead({ status: LeadStatus.Negotiation });

    const converted = await service.convert(leadId, {}, actorId);
    expect(converted.data?.status).toBe(LeadStatus.Won);
    expect(converted.data?.convertedCustomerId).toBeTruthy();
    expect(converted.data?.wonAt).toBeTruthy();

    await expect(
      service.update(leadId, { notes: 'Should fail' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cannot transition from won', async () => {
    const leadId = await seedLead({ status: LeadStatus.Won });

    await expect(
      service.transition(leadId, { status: LeadStatus.Lost, lostReason: 'Too late' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a customer when converting without customerId', async () => {
    const leadId = await seedLead({ status: LeadStatus.Proposal });

    const res = await service.convert(leadId, {}, actorId);
    const customer = await customerModel.findById(res.data!.convertedCustomerId!).exec();

    expect(customer).toBeTruthy();
    expect(customer?.fullName).toBe('Anita Sharma');
    expect(customer?.customerCode).toMatch(/^CUS-/);
    expect(customer?.fundingType).toBe(CustomerFundingType.OwnFunds);
    expect(customer?.status).toBe(CustomerStatus.Draft);
  });

  it('links an existing customer on convert', async () => {
    const existing = await customerModel.create({
      customerCode: 'CUS-000099',
      fullName: 'Existing Buyer',
      fundingType: CustomerFundingType.OwnFunds,
      status: CustomerStatus.Active,
      contact: {},
      address: {},
    });

    const leadId = await seedLead({ status: LeadStatus.Negotiation });
    const res = await service.convert(
      leadId,
      { customerId: String(existing._id) },
      actorId,
    );

    expect(res.data?.convertedCustomerId).toBe(String(existing._id));
  });
});
