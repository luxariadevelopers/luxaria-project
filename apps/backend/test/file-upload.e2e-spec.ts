import {
  BadRequestException,
  Controller,
  type INestApplication,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import request from 'supertest';
import { createSecureMulterOptions } from '../src/common/security/file-upload.util';
import { SAFE_IMAGE_MIME_TYPES } from '../src/common/security/security.constants';
import { createApiApp } from './helpers/create-api-app';

@Controller('upload-demo')
class UploadDemoController {
  @Post('logo')
  @UseInterceptors(
    FileInterceptor(
      'file',
      createSecureMulterOptions({
        maxBytes: 1024 * 1024,
        allowedMimeTypes: SAFE_IMAGE_MIME_TYPES,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      }),
    ),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file required');
    }
    return {
      success: true,
      data: { mime: file.mimetype, size: file.size },
      message: 'uploaded',
    };
  }
}

describe('File upload API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    @Module({ controllers: [UploadDemoController] })
    class UploadDemoModule {}

    const created = await createApiApp({ imports: [UploadDemoModule] });
    app = created.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects disallowed MIME types (e.g. SVG)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/upload-demo/logo')
      .attach('file', Buffer.from('<svg></svg>'), {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
  });

  it('accepts allowlisted PNG uploads', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    const res = await request(app.getHttpServer())
      .post('/api/v1/upload-demo/logo')
      .attach('file', png, {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.data.mime).toBe('image/png');
  });
});
