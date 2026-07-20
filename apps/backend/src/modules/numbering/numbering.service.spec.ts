import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberEntityType } from './numbering.constants';
import { NumberingService } from './numbering.service';
import { Counter, CounterSchema } from './schemas/counter.schema';

describe('NumberingService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let counterModel: Model<Counter>;
  let service: NumberingService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    await counterModel.syncIndexes();
    service = new NumberingService(counterModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await counterModel.deleteMany({});
  });

  it('formats FY-based project codes like PRJ-2026-0001', async () => {
    const first = await service.next(NumberEntityType.PROJECT, { financialYear: '2026' });
    const second = await service.next(NumberEntityType.PROJECT, { financialYear: '2026' });

    expect(first.code).toBe('PRJ-2026-0001');
    expect(second.code).toBe('PRJ-2026-0002');
  });

  it('formats vendor codes without year like VEN-000001', async () => {
    const code = await service.nextCode(NumberEntityType.VENDOR);
    expect(code).toBe('VEN-000001');
  });

  it('formats journal and PO codes with year and 6-digit padding', async () => {
    const jv = await service.nextCode(NumberEntityType.JOURNAL_ENTRY, {
      financialYear: '2026',
    });
    const po = await service.nextCode(NumberEntityType.PURCHASE_ORDER, {
      financialYear: '2026',
    });

    expect(jv).toBe('JV-2026-000001');
    expect(po).toBe('PO-2026-000001');
  });

  it('keeps separate sequences per financial year', async () => {
    const a = await service.next(NumberEntityType.PROJECT, { financialYear: '2026' });
    const b = await service.next(NumberEntityType.PROJECT, { financialYear: '2027' });

    expect(a.code).toBe('PRJ-2026-0001');
    expect(b.code).toBe('PRJ-2027-0001');
  });

  it('supports project-specific numbering when configured', async () => {
    const projectA = new Types.ObjectId();
    const projectB = new Types.ObjectId();

    const a1 = await service.next(NumberEntityType.PURCHASE_ORDER, {
      financialYear: '2026',
      projectId: projectA,
      projectScoped: true,
    });
    const b1 = await service.next(NumberEntityType.PURCHASE_ORDER, {
      financialYear: '2026',
      projectId: projectB,
      projectScoped: true,
    });
    const a2 = await service.next(NumberEntityType.PURCHASE_ORDER, {
      financialYear: '2026',
      projectId: projectA,
      projectScoped: true,
    });

    expect(a1.code).toBe('PO-2026-000001');
    expect(b1.code).toBe('PO-2026-000001');
    expect(a2.code).toBe('PO-2026-000002');
    expect(a1.scopeKey).not.toBe(b1.scopeKey);
  });

  it('does not use collection document counts for sequences', async () => {
    await service.next(NumberEntityType.VENDOR);
    await service.next(NumberEntityType.VENDOR);

    await counterModel.create({
      scopeKey: 'NOISE:GLOBAL:GLOBAL',
      entityType: NumberEntityType.COMPANY,
      prefix: 'CMP',
      financialYear: null,
      projectId: null,
      seq: 999,
      padLength: 4,
    });

    const third = await service.next(NumberEntityType.VENDOR);
    expect(third.code).toBe('VEN-000003');
    expect(third.sequence).toBe(3);
  });

  it('allocates unique codes under concurrent load', async () => {
    const parallel = 40;
    const results = await Promise.all(
      Array.from({ length: parallel }, () =>
        service.next(NumberEntityType.GOODS_RECEIPT, { financialYear: '2026' }),
      ),
    );

    const codes = results.map((r) => r.code);
    const sequences = results.map((r) => r.sequence).sort((a, b) => a - b);

    expect(new Set(codes).size).toBe(parallel);
    expect(sequences[0]).toBe(1);
    expect(sequences[sequences.length - 1]).toBe(parallel);
    expect(codes).toContain('GRN-2026-000001');
    expect(codes).toContain('GRN-2026-000040');
  });

  it('peeks without incrementing', async () => {
    expect(await service.peek(NumberEntityType.MATERIAL)).toBeNull();

    await service.next(NumberEntityType.MATERIAL);
    const peeked = await service.peek(NumberEntityType.MATERIAL);
    const next = await service.next(NumberEntityType.MATERIAL);

    expect(peeked?.code).toBe('MAT-000001');
    expect(next.code).toBe('MAT-000002');
  });
});
