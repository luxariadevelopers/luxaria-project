import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
} from './schemas/stock-reorder-alert.schema';
import { STOCK_REORDER_QUEUE } from './stock-reorder.constants';
import { StockReorderController } from './stock-reorder.controller';
import { StockReorderProcessor } from './stock-reorder.processor';
import { StockReorderScheduler } from './stock-reorder.scheduler';
import { StockReorderService } from './stock-reorder.service';

const redisEnabled =
  String(process.env.REDIS_ENABLED ?? 'false').toLowerCase() === 'true';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    MongooseModule.forFeature([
      { name: StockReorderAlert.name, schema: StockReorderAlertSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: MaterialStockBalance.name, schema: MaterialStockBalanceSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService<AppConfig, true>) => {
              const password = config.get('redisPassword', { infer: true });
              return {
                connection: {
                  host: config.get('redisHost', { infer: true }),
                  port: config.get('redisPort', { infer: true }),
                  ...(password ? { password } : {}),
                  maxRetriesPerRequest: null,
                },
              };
            },
          }),
          BullModule.registerQueue({ name: STOCK_REORDER_QUEUE }),
        ]
      : []),
  ],
  controllers: [StockReorderController],
  providers: [
    StockReorderService,
    StockReorderScheduler,
    ...(redisEnabled ? [StockReorderProcessor] : []),
  ],
  exports: [StockReorderService, StockReorderScheduler],
})
export class StockReorderModule {}
