import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { PublicCustomerReceipt } from './customer-receipts.mapper';

@Injectable()
export class CustomerReceiptPdfService {
  async generate(receipt: PublicCustomerReceipt): Promise<string> {
    const dir = join(
      process.cwd(),
      'uploads',
      'customer-receipts',
      receipt.projectId,
      receipt.id,
    );
    mkdirSync(dir, { recursive: true });
    const filename = `${receipt.receiptNumber}.pdf`;
    const absolutePath = join(dir, filename);
    const relativePath = `uploads/customer-receipts/${receipt.projectId}/${receipt.id}/${filename}`;

    const buffer = await this.buildPdfBuffer(receipt);
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  buildPdfBuffer(receipt: PublicCustomerReceipt): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).text('Customer Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Receipt Number: ${receipt.receiptNumber}`);
      doc.text(
        `Receipt Date: ${new Date(receipt.receiptDate).toISOString().slice(0, 10)}`,
      );
      doc.text(`Status: ${receipt.status}`);
      doc.text(`Customer Id: ${receipt.customerId}`);
      doc.text(`Booking Id: ${receipt.bookingId}`);
      doc.text(`Unit Id: ${receipt.unitId}`);
      doc.text(`Source Type: ${receipt.sourceType}`);
      if (receipt.loanBank) doc.text(`Loan Bank: ${receipt.loanBank}`);
      doc.text(`Payment Mode: ${receipt.paymentMode}`);
      if (receipt.transactionReference) {
        doc.text(`Transaction Reference: ${receipt.transactionReference}`);
      }
      if (receipt.companyBankAccountId) {
        doc.text(`Company Bank Account: ${receipt.companyBankAccountId}`);
      }
      doc.moveDown();
      doc.font('Helvetica-Bold').text(
        `Amount Received: ${receipt.amount.toFixed(2)}`,
      );
      doc.font('Helvetica');
      doc.text(`Allocated to demands: ${receipt.allocatedAmount.toFixed(2)}`);
      doc.text(
        `Unallocated advance: ${receipt.unallocatedAmount.toFixed(2)}`,
      );
      doc.moveDown();

      if (receipt.scheduleAllocation.length) {
        doc.font('Helvetica-Bold').text('Schedule Allocations');
        doc.font('Helvetica');
        for (const line of receipt.scheduleAllocation) {
          doc.text(
            `${line.milestone ?? line.demandId} | demand ${line.demandId} | ${line.amount.toFixed(2)}`,
          );
        }
        doc.moveDown();
      }

      if (receipt.remarks) {
        doc.text(`Remarks: ${receipt.remarks}`);
        doc.moveDown();
      }

      doc.moveDown(2);
      doc.text('Authorized Signatory: ____________________');
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(
          'This receipt acknowledges funds received. Unallocated amounts are held as customer advance until applied to payment demands.',
        );

      doc.end();
    });
  }
}
