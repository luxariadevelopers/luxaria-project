import { BadRequestException } from '@nestjs/common';
import { AnalyticsDrilldownService } from './drilldown.service';

describe('AnalyticsDrilldownService', () => {
  const service = new AnalyticsDrilldownService();

  it('returns a full receivables traceability path', () => {
    const res = service.getPath({
      kpi: 'receivables',
      projectId: '507f1f77bcf86cd799439011',
      customerId: '507f1f77bcf86cd799439012',
      bookingId: '507f1f77bcf86cd799439013',
    });
    const path = res.data!.path.map((p) => p.level);
    expect(path).toEqual([
      'kpi',
      'project',
      'customer',
      'booking',
      'demand',
      'receipt',
      'ledger',
    ]);
  });

  it('rejects unknown KPI keys', () => {
    expect(() => service.getPath({ kpi: 'unknown_metric' })).toThrow(
      BadRequestException,
    );
  });
});
