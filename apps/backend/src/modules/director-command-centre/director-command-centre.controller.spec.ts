import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { DirectorCommandCentreController } from './director-command-centre.controller';
import { DirectorCommandCentreService } from './director-command-centre.service';

describe('DirectorCommandCentreController', () => {
  let controller: DirectorCommandCentreController;
  let service: { getSummary: jest.Mock };

  beforeEach(async () => {
    service = {
      getSummary: jest.fn().mockResolvedValue({
        success: true,
        message: 'Director command centre summary',
        data: { filters: { date: '2026-07-20T00:00:00.000Z' } },
        meta: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectorCommandCentreController],
      providers: [
        {
          provide: DirectorCommandCentreService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get(DirectorCommandCentreController);
  });

  it('delegates summary to service with filters and actor', async () => {
    const query = {
      date: '2026-07-20',
      projectId: '64b000000000000000000001',
    };
    const actor = {
      id: '64b000000000000000000099',
      userCode: 'USR-1',
      fullName: 'Director',
      email: null,
      mobile: null,
      status: 'active',
    };

    const response = await controller.getSummary(query, actor);

    expect(service.getSummary).toHaveBeenCalledWith(query, actor.id);
    expect(response.success).toBe(true);
    expect(response.message).toBe('Director command centre summary');
  });
});
