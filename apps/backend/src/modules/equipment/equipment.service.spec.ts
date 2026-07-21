import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentStatus } from './schemas/equipment.schema';

describe('EquipmentService', () => {
  const projectId = '507f1f77bcf86cd799439011';
  const equipmentId = '507f1f77bcf86cd799439022';
  const actorId = '507f1f77bcf86cd799439033';

  function buildService(opts?: {
    equipmentEnabled?: boolean;
    projectMissing?: boolean;
    equipment?: Record<string, unknown> | null;
  }) {
    const equipmentEnabled = opts?.equipmentEnabled ?? true;
    const equipmentModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          opts?.equipment === undefined
            ? {
                _id: equipmentId,
                projectId,
                status: EquipmentStatus.Allocated,
                code: 'EXC-01',
                name: 'Excavator',
                allocations: [],
                fuelLogs: [],
                maintenanceLogs: [],
                breakdownLogs: [],
                createdBy: actorId,
              }
            : opts.equipment,
        ),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    const utilizationModel = {
      create: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439044',
        equipmentId,
        projectId,
        siteId: null,
        dprId: null,
        date: new Date('2026-07-21'),
        hoursWorked: 6,
        hoursIdle: 2,
        notes: null,
        createdBy: actorId,
      }),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    const projectModel = {
      findById: jest.fn().mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(
            opts?.projectMissing
              ? null
              : { _id: projectId, settings: { equipmentEnabled } },
          ),
        }),
      }),
    };

    const service = new EquipmentService(
      equipmentModel as never,
      utilizationModel as never,
      projectModel as never,
    );
    return { service, equipmentModel, utilizationModel, projectModel };
  }

  it('rejects utilization when equipmentEnabled is false (soft check)', async () => {
    const { service, utilizationModel } = buildService({
      equipmentEnabled: false,
    });

    await expect(
      service.createUtilization(
        {
          equipmentId,
          projectId,
          date: '2026-07-21',
          hoursWorked: 6,
          hoursIdle: 2,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(utilizationModel.create).not.toHaveBeenCalled();
  });

  it('creates utilization when equipmentEnabled is true', async () => {
    const { service, utilizationModel } = buildService({
      equipmentEnabled: true,
    });

    const result = await service.createUtilization(
      {
        equipmentId,
        projectId,
        date: '2026-07-21',
        hoursWorked: 6,
        hoursIdle: 2,
      },
      actorId,
    );

    expect(utilizationModel.create).toHaveBeenCalled();
    expect(result.data?.hoursWorked).toBe(6);
  });

  it('rejects utilization when project is missing', async () => {
    const { service } = buildService({ projectMissing: true });

    await expect(
      service.assertEquipmentEnabled(projectId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects utilization for retired equipment', async () => {
    const { service } = buildService({
      equipmentEnabled: true,
      equipment: {
        _id: equipmentId,
        projectId,
        status: EquipmentStatus.Retired,
      },
    });

    await expect(
      service.createUtilization(
        {
          equipmentId,
          projectId,
          date: '2026-07-21',
          hoursWorked: 1,
          hoursIdle: 0,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
