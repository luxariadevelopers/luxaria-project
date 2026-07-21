import { Types } from 'mongoose';
import { DprService } from './dpr.service';
import {
  DprShift,
  DprStatus,
  DprWeather,
} from './schemas/daily-progress-report.schema';
import { MaterialIssueStatus } from '../material-issues/schemas/material-issue.schema';

/**
 * Focused unit test: approve() → MaterialIssuesService.confirmForDpr
 * (no MongoMemoryServer — mocks only).
 */
describe('DprService.approve → confirmForDpr', () => {
  it('confirms each linked draft material issue and marks reservations consumed', async () => {
    const actorId = new Types.ObjectId().toHexString();
    const dprId = new Types.ObjectId();
    const projectId = new Types.ObjectId();
    const siteId = new Types.ObjectId();
    const issueId = new Types.ObjectId();
    const reservationId = new Types.ObjectId();

    const row = {
      _id: dprId,
      dprNumber: 'DPR-UT-001',
      projectId,
      siteId,
      reportDate: new Date('2026-07-21T00:00:00.000Z'),
      shift: DprShift.General,
      weather: DprWeather.Clear,
      workPerformed: 'Pour',
      status: DprStatus.Submitted,
      materialsIssued: [],
      materialIssueIds: [issueId],
      stockReservationIds: [reservationId],
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    };

    const issueDoc = {
      _id: issueId,
      dprId,
      status: MaterialIssueStatus.Draft,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const confirmForDpr = jest.fn().mockResolvedValue({
      data: { id: String(issueId), status: MaterialIssueStatus.Confirmed },
    });
    const markConsumed = jest.fn().mockResolvedValue({ data: {} });
    const listActiveBySource = jest.fn().mockResolvedValue([]);

    const dprModel = {
      findById: jest.fn().mockReturnValue({
        exec: async () => row,
      }),
    };
    const materialIssueModel = {
      find: jest.fn().mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: async () => [{ _id: issueId }],
          }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        exec: async () => issueDoc,
      }),
    };

    const service = new DprService(
      dprModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      materialIssueModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
      } as never,
      {
        confirmForDpr,
        create: jest.fn(),
      } as never,
      {
        create: jest.fn(),
        markConsumed,
        listActiveBySource,
      } as never,
    );

    const result = await service.approve(String(dprId), {}, actorId);

    expect(confirmForDpr).toHaveBeenCalledWith(
      String(issueId),
      String(dprId),
      actorId,
    );
    expect(markConsumed).toHaveBeenCalledWith(String(reservationId), actorId);
    expect(result.data!.status).toBe(DprStatus.Approved);
    expect(row.approvedBy).toBeTruthy();
  });
});
