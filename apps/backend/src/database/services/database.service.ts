import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { maskMongoUri } from '../utils/mask-mongo-uri';
import type { TransactionWork } from '../utils/transaction.helper';
import { withTransaction } from '../utils/transaction.helper';

export type DatabaseHealth = {
  status: 'up' | 'down';
  readyState: number;
  readyStateLabel: string;
  host: string;
  name: string;
  maskedUri: string;
};

const READY_STATE_LABELS: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly mongodbUri: string;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    configService: ConfigService,
  ) {
    this.mongodbUri = configService.getOrThrow<AppConfig['mongodbUri']>('mongodbUri');
  }

  onModuleInit(): void {
    this.connection.on('connected', () => {
      this.logger.log(`MongoDB connected: ${maskMongoUri(this.mongodbUri)}`);
    });

    this.connection.on('reconnected', () => {
      this.logger.log(`MongoDB reconnected: ${maskMongoUri(this.mongodbUri)}`);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });

    this.connection.on('error', (error: Error) => {
      this.logger.error(`MongoDB connection error: ${error.message}`);
    });

    if (this.connection.readyState === 1) {
      this.logger.log(`MongoDB connected: ${maskMongoUri(this.mongodbUri)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.close();
  }

  getConnection(): Connection {
    return this.connection;
  }

  getHealth(): DatabaseHealth {
    const readyState = this.connection.readyState;
    const host = this.connection.host || 'unknown';
    const name = this.connection.name || 'unknown';

    return {
      status: readyState === 1 ? 'up' : 'down',
      readyState,
      readyStateLabel: READY_STATE_LABELS[readyState] ?? 'unknown',
      host,
      name,
      maskedUri: maskMongoUri(this.mongodbUri),
    };
  }

  withTransaction<T>(work: TransactionWork<T>): Promise<T> {
    return withTransaction(this.connection, work);
  }
}
