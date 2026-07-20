import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { JournalModule } from '../journal/journal.module';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from './schemas/vendor-invoice.schema';
import { VendorInvoicesController } from './vendor-invoices.controller';
import { VendorInvoicesService } from './vendor-invoices.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    JournalModule,
  ],
  controllers: [VendorInvoicesController],
  providers: [VendorInvoicesService],
  exports: [VendorInvoicesService, MongooseModule],
})
export class VendorInvoicesModule {}
