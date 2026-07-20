import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { Types } from 'mongoose';
import type { ContributionReceipt } from './schemas/contribution-receipt.schema';

type ReceiptForPdf = ContributionReceipt & { _id: Types.ObjectId };

@Injectable()
export class ContributionReceiptPdfService {
  /**
   * Generates a simple contribution receipt PDF and returns the relative path.
   */
  async generate(receipt: ReceiptForPdf): Promise<string> {
    const id = String(receipt._id);
    const projectId = String(receipt.projectId);
    const dir = join(
      process.cwd(),
      'uploads',
      'contribution-receipts',
      projectId,
      id,
    );
    mkdirSync(dir, { recursive: true });
    const filename = `${receipt.receiptNumber}.pdf`;
    const absolutePath = join(dir, filename);
    const relativePath = `uploads/contribution-receipts/${projectId}/${id}/${filename}`;

    const buffer = await this.buildPdfBuffer(receipt);
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  private buildPdfBuffer(receipt: ReceiptForPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text('Contribution Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Receipt No: ${receipt.receiptNumber}`);
      doc.text(`Received Date: ${receipt.receivedDate.toISOString().slice(0, 10)}`);
      doc.text(`Amount: INR ${receipt.amount.toLocaleString('en-IN')}`);
      doc.text(`Payment Mode: ${receipt.paymentMode}`);
      if (receipt.transactionReference) {
        doc.text(`Transaction Reference: ${receipt.transactionReference}`);
      }
      if (receipt.bankAccountId) {
        doc.text(`Bank Account Id: ${String(receipt.bankAccountId)}`);
      }
      doc.text(`Project Id: ${String(receipt.projectId)}`);
      doc.text(`Participant Id: ${String(receipt.participantId)}`);
      doc.text(`Commitment Id: ${String(receipt.commitmentId)}`);
      doc.text(`Status: ${receipt.status}`);
      if (receipt.remarks) {
        doc.moveDown();
        doc.text(`Remarks: ${receipt.remarks}`);
      }
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#555555').text(
        'This receipt will be linked to accounting journal entries when the ledger module is enabled.',
        { align: 'left' },
      );
      doc.end();
    });
  }
}
