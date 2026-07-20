import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

type CreateApiAppOptions = {
  metadata: ModuleMetadata;
  /** Runs after Nest app creation, before `init()` (e.g. attach middleware). */
  beforeInit?: (app: INestApplication) => void | Promise<void>;
};

/**
 * Boots a Nest app for Supertest API / e2e suites.
 */
export async function createApiApp(
  metadataOrOptions: ModuleMetadata | CreateApiAppOptions,
): Promise<{ app: INestApplication; module: TestingModule }> {
  const options: CreateApiAppOptions =
    'metadata' in metadataOrOptions && metadataOrOptions.metadata
      ? (metadataOrOptions as CreateApiAppOptions)
      : { metadata: metadataOrOptions as ModuleMetadata };

  const module = await Test.createTestingModule(options.metadata).compile();
  const app = module.createNestApplication<NestExpressApplication>();

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (options.beforeInit) {
    await options.beforeInit(app);
  }

  await app.init();
  return { app, module };
}
