import { NotFoundException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { AuditLogService } from './audit-log.service';
import {
  AuditAction,
  AuditLog,
  AuditLogSchema,
} from './schemas/audit-log.schema';

describe('AuditLogService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let auditModel: Model<AuditLog>;
  let service: AuditLogService;

  const userA = new Types.ObjectId().toHexString();
  const userB = new Types.ObjectId().toHexString();
  const projectA = new Types.ObjectId().toHexString();
  const projectB = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    auditModel = connection.model(
      AuditLog.name,
      AuditLogSchema,
    ) as Model<AuditLog>;
    await auditModel.syncIndexes();
    service = new AuditLogService(auditModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await auditModel.collection.deleteMany({});
  });

  it('records an audit entry and masks sensitive before/after data', async () => {
    const entry = await service.record({
      userId: userA,
      action: AuditAction.UPDATE,
      module: 'Investors',
      entityType: 'Investor',
      entityId: new Types.ObjectId().toHexString(),
      projectId: projectA,
      beforeData: { password: 'old-pass', name: 'A' },
      afterData: {
        password: 'new-pass',
        bankDetails: { accountNumber: '998877665544' },
      },
      ipAddress: '10.0.0.8',
      userAgent: 'jest',
      requestId: 'req-1',
      deviceId: 'dev-1',
    });

    expect(entry.module).toBe('investors');
    expect(entry.entityType).toBe('investor');
    expect(entry.beforeData?.password).toMatch(/^\*{8}/);
    expect(entry.afterData?.password).toMatch(/^\*{8}/);
    expect(
      (entry.afterData?.bankDetails as { accountNumber: string }).accountNumber,
    ).toBe('********5544');
    expect(entry.ipAddress).toBe('10.0.0.8');
    expect(entry.requestId).toBe('req-1');
    expect(entry.deviceId).toBe('dev-1');
  });

  it('blocks updates and deletes through mongoose APIs', async () => {
    const entry = await service.record({
      userId: userA,
      action: AuditAction.CREATE,
      module: 'auth',
      entityType: 'session',
      entityId: '1',
    });

    await expect(
      auditModel.updateOne(
        { _id: entry.id },
        { $set: { action: AuditAction.DELETE } },
      ),
    ).rejects.toThrow(/immutable/i);

    await expect(auditModel.deleteOne({ _id: entry.id })).rejects.toThrow(
      /immutable/i,
    );
  });

  it('filters by user, module, project, and date range', async () => {
    const t1 = new Date('2026-03-01T10:00:00.000Z');
    const t2 = new Date('2026-03-15T10:00:00.000Z');
    const t3 = new Date('2026-04-01T10:00:00.000Z');

    await service.record({
      userId: userA,
      action: AuditAction.LOGIN,
      module: 'auth',
      entityType: 'session',
      projectId: projectA,
      timestamp: t1,
    });
    await service.record({
      userId: userA,
      action: AuditAction.APPROVE,
      module: 'approvals',
      entityType: 'approval_request',
      projectId: projectA,
      timestamp: t2,
    });
    await service.record({
      userId: userB,
      action: AuditAction.EXPORT,
      module: 'reports',
      entityType: 'report',
      projectId: projectB,
      timestamp: t3,
    });

    const byUser = await service.list({ userId: userA, page: 1, limit: 20 });
    expect(byUser.data).toHaveLength(2);

    const byModule = await service.list({
      module: 'approvals',
      page: 1,
      limit: 20,
    });
    expect(byModule.data).toHaveLength(1);
    expect(byModule.data?.[0].action).toBe(AuditAction.APPROVE);

    const byProject = await service.list({
      projectId: projectB,
      page: 1,
      limit: 20,
    });
    expect(byProject.data).toHaveLength(1);
    expect(byProject.data?.[0].userId).toBe(userB);

    const byDate = await service.list({
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-31T23:59:59.999Z',
      page: 1,
      limit: 20,
    });
    expect(byDate.data).toHaveLength(2);
  });

  it('returns a single entry by id', async () => {
    const entry = await service.record({
      userId: userA,
      action: AuditAction.DOWNLOAD,
      module: 'documents',
      entityType: 'document',
      entityId: 'doc-1',
    });

    const found = await service.getById(entry.id);
    expect(found.data?.id).toBe(entry.id);
    expect(found.data?.action).toBe(AuditAction.DOWNLOAD);

    await expect(service.getById(new Types.ObjectId().toHexString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
