import {
  Controller,
  Get,
  type INestApplication,
  Module,
} from '@nestjs/common';
import request from 'supertest';
import { Public } from '../src/common/decorators/public.decorator';
import { createApiApp } from './helpers/create-api-app';

@Controller('health')
class HealthDemoController {
  @Public()
  @Get()
  getHealth() {
    return {
      success: true,
      message: 'Health check successful',
      data: { status: 'ok', uptimeSeconds: 1 },
    };
  }
}

describe('Health API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    @Module({ controllers: [HealthDemoController] })
    class HealthDemoModule {}

    const created = await createApiApp({ imports: [HealthDemoModule] });
    app = created.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health returns success envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
      data: expect.objectContaining({
        status: expect.any(String),
      }),
    });
  });
});
