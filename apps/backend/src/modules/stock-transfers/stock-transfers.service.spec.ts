import { BadRequestException } from '@nestjs/common';
import { StockTransfersService } from './stock-transfers.service';
import { StockTransferScope } from './schemas/stock-transfer.schema';

describe('StockTransfersService', () => {
  it('rejects same source/destination location within a project', async () => {
    const service = new StockTransfersService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        {
          scope: StockTransferScope.WarehouseToWarehouse,
          sourceProjectId: '507f1f77bcf86cd799439011',
          destProjectId: '507f1f77bcf86cd799439011',
          sourceLocation: 'MAIN',
          destLocation: 'MAIN',
          transferDate: '2026-07-21',
          items: [],
        } as never,
        '507f1f77bcf86cd799439012',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
