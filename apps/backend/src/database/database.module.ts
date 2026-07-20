import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { AppConfig } from '../config/configuration';
import { IdempotencyKey, IdempotencyKeySchema } from './schemas/idempotency-key.schema';
import { DatabaseService } from './services/database.service';
import { IdempotencyService } from './services/idempotency.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<AppConfig['mongodbUri']>('mongodbUri');
        const nodeEnv = configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv');

        return {
          uri,
          autoIndex: nodeEnv !== 'production',
          maxPoolSize: 10,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 10_000,
          socketTimeoutMS: 45_000,
          connectTimeoutMS: 10_000,
          heartbeatFrequencyMS: 10_000,
          retryWrites: true,
          retryReads: true,
        };
      },
    }),
    MongooseModule.forFeature([{ name: IdempotencyKey.name, schema: IdempotencyKeySchema }]),
  ],
  providers: [DatabaseService, IdempotencyService],
  exports: [DatabaseService, IdempotencyService, MongooseModule],
})
export class DatabaseModule {}
