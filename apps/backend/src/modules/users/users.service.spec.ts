import { ConflictException, NotFoundException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { User, UserSchema, UserStatus } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let userModel: Model<User>;
  let service: UsersService;

  const sessionService = {
    revokeAllForUser: jest.fn().mockResolvedValue({ acknowledged: true }),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    await userModel.syncIndexes();
    await counterModel.syncIndexes();

    const numberingService = new NumberingService(counterModel);
    const rolesService = {
      assertActiveRoleIds: jest.fn().mockResolvedValue(undefined),
    };
    const projectAccessService = {
      assignProjectsToUser: jest
        .fn()
        .mockImplementation(async (userId: string, projectIds: string[]) => {
          await userModel.findByIdAndUpdate(userId, {
            $addToSet: {
              assignedProjects: {
                $each: projectIds.map((id) => new Types.ObjectId(id)),
              },
            },
          });
        }),
      removeProjectsFromUser: jest
        .fn()
        .mockImplementation(async (userId: string, projectIds: string[]) => {
          await userModel.findByIdAndUpdate(userId, {
            $pull: {
              assignedProjects: {
                $in: projectIds.map((id) => new Types.ObjectId(id)),
              },
            },
          });
        }),
    };
    service = new UsersService(
      userModel,
      numberingService,
      sessionService as never,
      rolesService as never,
      projectAccessService as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    jest.clearAllMocks();
  });

  it('creates a user with generated userCode and unique email', async () => {
    const response = await service.create({
      fullName: 'Finance Manager',
      email: 'finance@luxaria.dev',
      mobile: '9000000001',
      password: 'ChangeMe123!',
      department: 'Finance',
      designation: 'Manager',
    });

    expect(response.success).toBe(true);
    expect(response.data?.userCode).toMatch(/^USR-/);
    expect(response.data?.email).toBe('finance@luxaria.dev');
    expect(response.data?.department).toBe('Finance');
  });

  it('rejects duplicate email', async () => {
    await service.create({
      fullName: 'User A',
      email: 'dup@luxaria.dev',
      password: 'ChangeMe123!',
    });

    await expect(
      service.create({
        fullName: 'User B',
        email: 'dup@luxaria.dev',
        password: 'ChangeMe123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates user and revokes sessions', async () => {
    const created = await service.create({
      fullName: 'Temp User',
      email: 'temp@luxaria.dev',
      password: 'ChangeMe123!',
    });

    const response = await service.deactivate(created.data!.id);
    expect(response.data?.status).toBe(UserStatus.Inactive);
    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(created.data!.id);
  });

  it('assigns and removes projects', async () => {
    const created = await service.create({
      fullName: 'Engineer',
      email: 'eng@luxaria.dev',
      password: 'ChangeMe123!',
    });
    const projectId = new Types.ObjectId().toHexString();

    const assigned = await service.assignProjects(created.data!.id, {
      projectIds: [projectId],
    });
    expect(assigned.data?.assignedProjects).toContain(projectId);

    const removed = await service.removeProjects(created.data!.id, {
      projectIds: [projectId],
    });
    expect(removed.data?.assignedProjects).not.toContain(projectId);
  });

  it('lists users with filters and pagination meta', async () => {
    await service.create({
      fullName: 'Alpha',
      email: 'alpha@luxaria.dev',
      password: 'ChangeMe123!',
      department: 'Purchase',
      status: UserStatus.Active,
    });
    await service.create({
      fullName: 'Beta',
      email: 'beta@luxaria.dev',
      password: 'ChangeMe123!',
      department: 'Finance',
      status: UserStatus.Inactive,
    });

    const response = await service.list({
      department: 'Purchase',
      page: 1,
      limit: 10,
    });

    expect(response.data).toHaveLength(1);
    expect(response.data?.[0]?.fullName).toBe('Alpha');
    expect(response.meta?.total).toBe(1);
  });

  it('soft deletes a user', async () => {
    const created = await service.create({
      fullName: 'Delete Me',
      email: 'delete@luxaria.dev',
      password: 'ChangeMe123!',
    });

    await service.softDeleteUser(created.data!.id);
    await expect(service.getById(created.data!.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses numbering service entity type USER', async () => {
    const numbering = {
      nextCode: jest.fn().mockResolvedValue('USR-000042'),
    };
    const isolated = new UsersService(
      userModel,
      numbering as unknown as NumberingService,
      sessionService as never,
      { assertActiveRoleIds: jest.fn().mockResolvedValue(undefined) } as never,
      {
        assignProjectsToUser: jest.fn().mockResolvedValue(undefined),
        removeProjectsFromUser: jest.fn().mockResolvedValue(undefined),
      } as never,
    );

    const response = await isolated.create({
      fullName: 'Numbered',
      email: 'numbered@luxaria.dev',
      password: 'ChangeMe123!',
    });

    expect(numbering.nextCode).toHaveBeenCalledWith(NumberEntityType.USER);
    expect(response.data?.userCode).toBe('USR-000042');
  });
});
