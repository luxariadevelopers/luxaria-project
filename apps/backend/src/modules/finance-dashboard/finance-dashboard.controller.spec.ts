import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { FinanceDashboardExportService } from './finance-dashboard-export.service';
import { FinanceDashboardController } from './finance-dashboard.controller';
import { FinanceDashboardService } from './finance-dashboard.service';

describe('FinanceDashboardController', () => {
  let controller: FinanceDashboardController;
  let service: { getSummary: jest.Mock };
  let exportService: { export: jest.Mock };

  beforeEach(async () => {
    service = {
      getSummary: jest.fn().mockResolvedValue({
        success: true,
        message: 'Finance dashboard summary',
        data: { companyBankBalances: { amount: 1 } },
        meta: {},
      }),
    };
    exportService = {
      export: jest.fn().mockResolvedValue({
        filename: 'finance-dashboard-2026-07-20.csv',
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from('section,metric,value\n'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceDashboardController],
      providers: [
        { provide: FinanceDashboardService, useValue: service },
        { provide: FinanceDashboardExportService, useValue: exportService },
      ],
    }).compile();

    controller = module.get(FinanceDashboardController);
  });

  it('delegates summary with filters and actor', async () => {
    const query = { date: '2026-07-20', horizonDays: 30 };
    const actor = {
      id: '64b000000000000000000099',
      userCode: 'USR-1',
      fullName: 'Finance',
      email: null,
      mobile: null,
      status: 'active',
    };

    const response = await controller.getSummary(query, actor);
    expect(service.getSummary).toHaveBeenCalledWith(query, actor.id);
    expect(response.success).toBe(true);
  });

  it('streams export response', async () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const actor = {
      id: '64b000000000000000000099',
      userCode: 'USR-1',
      fullName: 'Finance',
      email: null,
      mobile: null,
      status: 'active',
    };

    await controller.export(
      { format: 'csv', date: '2026-07-20' },
      actor,
      res as never,
    );

    expect(exportService.export).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.send).toHaveBeenCalled();
  });
});
