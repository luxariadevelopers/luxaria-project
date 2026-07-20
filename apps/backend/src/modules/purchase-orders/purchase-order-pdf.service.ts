import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { PublicPurchaseOrder } from './purchase-orders.mapper';

@Injectable()
export class PurchaseOrderPdfService {
  async generate(po: PublicPurchaseOrder): Promise<string> {
    const id = po.id;
    const dir = join(
      process.cwd(),
      'uploads',
      'purchase-orders',
      po.projectId,
      id,
    );
    mkdirSync(dir, { recursive: true });
    const filename = `${po.purchaseOrderNumber}-r${po.revisionNumber}.pdf`;
    const absolutePath = join(dir, filename);
    const relativePath = `uploads/purchase-orders/${po.projectId}/${id}/${filename}`;

    const buffer = await this.buildPdfBuffer(po);
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  buildPdfBuffer(po: PublicPurchaseOrder): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).text('Purchase Order', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`PO Number: ${po.purchaseOrderNumber}`);
      doc.text(`Revision: ${po.revisionNumber}`);
      doc.text(`Status: ${po.status}`);
      doc.text(`Order Date: ${new Date(po.orderDate).toISOString().slice(0, 10)}`);
      doc.text(
        `Expected Delivery: ${new Date(po.expectedDeliveryDate).toISOString().slice(0, 10)}`,
      );
      doc.text(`Vendor Id: ${po.vendorId}`);
      doc.text(`Payment Terms: ${po.paymentTerms ?? '-'}`);
      doc.moveDown();

      doc.text('Billing Address:');
      doc.text(
        `${po.billingAddress.line1}, ${po.billingAddress.city}, ${po.billingAddress.state} ${po.billingAddress.pincode}`,
      );
      doc.moveDown(0.5);
      doc.text('Delivery Address:');
      doc.text(
        `${po.deliveryAddress.line1}, ${po.deliveryAddress.city}, ${po.deliveryAddress.state} ${po.deliveryAddress.pincode}`,
      );
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Items');
      doc.font('Helvetica');
      for (const item of po.items) {
        doc.text(
          `${item.materialCode ?? item.materialId} | qty ${item.quantity} ${item.unit} @ ${item.rate} | tax ${item.tax} | disc ${item.discount} | total ${item.total} | recv ${item.receivedQuantity} | bal ${item.balanceQuantity}`,
        );
      }
      doc.moveDown();
      doc.text(`Subtotal: ${po.subtotal}`);
      doc.text(`Taxes: ${po.taxes}`);
      doc.text(`Freight: ${po.freight}`);
      doc.text(`Discount: ${po.discount}`);
      doc.font('Helvetica-Bold').text(`Total: ${po.total}`);
      doc.font('Helvetica');
      doc.text(
        `PO Balance: qty ${po.balanceQuantity} | amount ${po.balanceAmount}`,
      );
      if (po.terms) {
        doc.moveDown();
        doc.text(`Terms: ${po.terms}`);
      }
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(
          'This purchase order is binding upon issue. Revisions after approval create a new version requiring re-approval.',
        );

      doc.end();
    });
  }
}
