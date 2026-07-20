import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { SignedPaymentVoucher } from './schemas/signed-payment-voucher.schema';

@Injectable()
export class SignedPaymentVoucherPdfService {
  async buildPdfBuffer(voucher: SignedPaymentVoucher): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const title =
        voucher.voucherType === 'labour'
          ? 'Labour Payment Voucher'
          : 'Cash Payment Voucher';

      doc.fontSize(16).text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Voucher No: ${voucher.voucherNumber}`);
      doc.text(`Captured: ${voucher.capturedAt.toISOString()}`);
      doc.text(`Recipient: ${voucher.recipientName}`);
      if (voucher.recipientMobile) {
        doc.text(`Mobile: ${voucher.recipientMobile}`);
      }
      doc.text(`Work description: ${voucher.workDescription}`);
      doc.moveDown(0.5);
      doc.text(
        `Gross amount: INR ${voucher.grossAmount.toLocaleString('en-IN')}`,
      );
      doc.text(
        `Deductions: INR ${voucher.deductions.toLocaleString('en-IN')}`,
      );
      doc.text(
        `Net amount: INR ${voucher.netAmount.toLocaleString('en-IN')}`,
      );
      doc.moveDown(0.5);
      if (voucher.latitude != null && voucher.longitude != null) {
        doc.text(`GPS: ${voucher.latitude}, ${voucher.longitude}`);
      }
      if (voucher.deviceId) {
        doc.text(`Device ID: ${voucher.deviceId}`);
      }
      doc.moveDown();
      doc.text(
        `Recipient signature checksum: ${
          voucher.recipientSignatureChecksum ?? '—'
        }`,
      );
      doc.text(
        `Engineer signature checksum: ${
          voucher.engineerSignatureChecksum ?? '—'
        }`,
      );
      if (voucher.requiresWitnessSignature) {
        doc.text(
          `Witness signature checksum: ${
            voucher.witnessSignatureChecksum ?? '—'
          }`,
        );
      }
      if (voucher.requiresRecipientPhoto) {
        doc.text(
          `Recipient photo checksum: ${voucher.recipientPhotoChecksum ?? '—'}`,
        );
      }
      doc.moveDown(1.5);
      doc.fontSize(9).fillColor('#555555').text(
        'Signatures are stored in private S3. Checksums are SHA-256 hex digests bound at attach time. This PDF is generated at approval and is immutable thereafter.',
      );
      doc.end();
    });
  }
}
