import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { InvestorPortalController } from './investor-portal.controller';
import { InvestorPortalService } from './investor-portal.service';

describe('InvestorPortalController', () => {
  let controller: InvestorPortalController;
  let service: {
    getMe: jest.Mock;
    listProjects: jest.Mock;
    getProject: jest.Mock;
    publishReport: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getMe: jest.fn().mockResolvedValue({ success: true, data: {} }),
      listProjects: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getProject: jest.fn().mockResolvedValue({ success: true, data: {} }),
      publishReport: jest.fn().mockResolvedValue({ success: true, data: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestorPortalController],
      providers: [{ provide: InvestorPortalService, useValue: service }],
    }).compile();

    controller = module.get(InvestorPortalController);
  });

  it('scopes portal reads to current actor', async () => {
    const actor = {
      id: '64b0000000000000000000aa',
      userCode: 'INV-1',
      fullName: 'Investor',
      email: null,
      mobile: null,
      status: 'active',
    };

    await controller.getMe(actor);
    await controller.listProjects(actor);
    await controller.getProject('64b000000000000000000001', actor);

    expect(service.getMe).toHaveBeenCalledWith(actor.id);
    expect(service.listProjects).toHaveBeenCalledWith(actor.id);
    expect(service.getProject).toHaveBeenCalledWith(
      '64b000000000000000000001',
      actor.id,
    );
  });
});
