import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ErrorTrackingService } from './common/observability/error-tracking.service';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<AppConfig['port']>('port');
  const corsOrigins =
    configService.getOrThrow<AppConfig['corsOrigins']>('corsOrigins');
  const swaggerEnabled =
    configService.getOrThrow<AppConfig['swaggerEnabled']>('swaggerEnabled');
  const appName = configService.getOrThrow<AppConfig['appName']>('appName');
  const appVersion =
    configService.getOrThrow<AppConfig['appVersion']>('appVersion');
  const nodeEnv = configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv');

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  app.use(
    helmet({
      // Pure JSON API — disable CSP that targets HTML pages; keep other defaults.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts:
        nodeEnv === 'production'
          ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
          : false,
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      noSniff: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  // Company logos are non-sensitive branding assets. Keep static exposure
  // constrained to this directory; documents and generated reports remain
  // behind their authenticated APIs.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'company'), {
    prefix: '/uploads/company',
    index: false,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads', 'users'), {
    prefix: '/uploads/users',
    index: false,
  });

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (mobile / curl) send no Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Device-Id',
      'Idempotency-Key',
      'X-Project-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(app.get(ErrorTrackingService)));
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription('Luxaria Developers Construction ERP API')
      .setVersion(appVersion)
      .addBearerAuth()
      .addCookieAuth('luxaria_refresh_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);

  console.log(`${appName} listening on http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
