import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { RfqService } from './rfq.service';
import { Rfq, RfqSchema, RfqStatus } from './schemas/rfq.schema';

describe('RfqService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: RfqService;
  let projectId: string;
  let prId: string;
  let vendorId: string;
  let actorId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const rfqModel = connection.model(Rfq.name, RfqSchema) as Model<Rfq>;
    const prModel = connection.model(
      PurchaseRequest.name,
      PurchaseRequestSchema,
    ) as Model<PurchaseRequest>;
    const vendorModel = connection.model(
      Vendor.name,
      VendorSchema,
    ) as Model<Vendor>;
    const quotationModel = connection.model(
      VendorQuotation.name,
      VendorQuotationSchema,
    ) as Model<VendorQuotation>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    connection.model(Material.name, MaterialSchema);

    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
    } as never;
    const mockSitesService = {
      findById: jest.fn().mockResolvedValue(null),
    } as never;

    service = new RfqService(
      rfqModel,
      prModel,
      vendorModel,
      quotationModel,
      projectModel,
      new NumberingService(counterModel),
      mockProjectScope,
      mockSitesService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await Promise.all([
      connection.model(Rfq.name).deleteMany({}),
      connection.model(PurchaseRequest.name).deleteMany({}),
      connection.model(Vendor.name).deleteMany({}),
      connection.model(Project.name).deleteMany({}),
      connection.model(Counter.name).deleteMany({}),
      connection.model(Material.name).deleteMany({}),
    ]);

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-RFQ-1',
        projectName: 'RFQ Project',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'TN',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
      },
    ]);
    projectId = String(project._id);

    const [material] = await connection.model(Material.name).create([
      {
        materialCode: 'MAT-RFQ',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        status: MaterialStatus.Active,
        ledgerAccountId: new Types.ObjectId(),
      },
    ]);

    const [pr] = await connection.model(PurchaseRequest.name).create([
      {
        requestNumber: 'PR-2026-000001',
        projectId: project._id,
        requestedBy: new Types.ObjectId(actorId),
        requiredByDate: new Date('2026-08-01'),
        items: [
          {
            materialId: material._id,
            requestedQuantity: 10,
            unit: MaterialUnit.Bag,
            currentStock: 0,
            reorderLevel: 0,
            minimumStock: 0,
            maximumStock: 0,
          },
        ],
        justification: 'RFQ test',
        status: PurchaseRequestStatus.Approved,
      },
    ]);
    prId = String(pr._id);

    const [vendor] = await connection.model(Vendor.name).create([
      {
        vendorCode: 'VEN-RFQ',
        legalName: 'RFQ Vendor',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
    ]);
    vendorId = String(vendor._id);
  });

  it('issues a draft RFQ and sets issuedAt/issuedBy', async () => {
    const created = await service.create(
      {
        projectId,
        purchaseRequestId: prId,
        title: 'Cement RFQ',
        vendorIds: [vendorId],
        closingDate: '2026-08-20',
      },
      actorId,
    );
    expect(created.data?.status).toBe(RfqStatus.Draft);

    const issued = await service.issue(created.data!.id, actorId);
    expect(issued.data?.status).toBe(RfqStatus.Issued);
    expect(issued.data?.issuedAt).toBeTruthy();
    expect(issued.data?.issuedBy).toBe(actorId);
  });

  it('rejects issue when RFQ has no vendors', async () => {
    const row = await connection.model(Rfq.name).create({
      projectId: new Types.ObjectId(projectId),
      purchaseRequestId: new Types.ObjectId(prId),
      rfqNumber: 'RFQ-2026-000099',
      title: 'Empty',
      status: RfqStatus.Draft,
      vendorIds: [],
      closingDate: new Date('2026-08-20'),
    });

    await expect(service.issue(String(row._id), actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
