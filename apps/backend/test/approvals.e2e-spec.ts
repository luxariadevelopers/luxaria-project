import {
  Body,
  Controller,
  type INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { IsMongoId, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { createApiApp } from './helpers/create-api-app';

class DecideDto {
  @IsMongoId()
  requestId!: string;

  @IsString()
  @MinLength(3)
  decision!: string;
}

@Controller('approval-demo')
class ApprovalDemoController {
  @Post('decide')
  decide(@Body() dto: DecideDto) {
    return {
      success: true,
      data: { requestId: dto.requestId, decision: dto.decision },
      message: 'decided',
    };
  }
}

/**
 * API-level validation for approval decision payloads (DTO + ValidationPipe).
 * Domain approval workflows are covered in ApprovalsService unit specs.
 */
describe('Approvals API validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    @Module({ controllers: [ApprovalDemoController] })
    class ApprovalDemoModule {}

    const created = await createApiApp({ imports: [ApprovalDemoModule] });
    app = created.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid approval decision payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/approval-demo/decide')
      .send({ requestId: 'not-an-id', decision: 'ok' })
      .expect(400);
  });

  it('accepts valid approval decision payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/approval-demo/decide')
      .send({
        requestId: '507f1f77bcf86cd799439011',
        decision: 'approve',
      })
      .expect(201);
  });
});
