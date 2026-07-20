import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ProjectDashboardController } from './project-dashboard.controller';
import { ProjectDashboardService } from './project-dashboard.service';

describe('ProjectDashboardController', () => {
  let controller: ProjectDashboardController;
  let service: { getDashboard: jest.Mock };

  beforeEach(async () => {
    service = {
      getDashboard: jest.fn().mockResolvedValue({
        success: true,
        message: 'Project dashboard summary',
        data: { projectStage: { stage: 'structure' } },
        meta: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectDashboardController],
      providers: [
        { provide: ProjectDashboardService, useValue: service },
      ],
    }).compile();

    controller = module.get(ProjectDashboardController);
  });

  it('delegates dashboard request with project id and date filters', async () => {
    const query = { date: '2026-07-20', from: '2026-04-01', to: '2026-07-20' };
    const response = await controller.getDashboard(
      '64b000000000000000000001',
      query,
    );

    expect(service.getDashboard).toHaveBeenCalledWith(
      '64b000000000000000000001',
      query,
    );
    expect(response.success).toBe(true);
    expect(response.message).toBe('Project dashboard summary');
  });
});
