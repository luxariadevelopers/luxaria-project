import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { PublicBooking } from './bookings.mapper';

@Injectable()
export class BookingPdfService {
  async generate(booking: PublicBooking): Promise<string> {
    const dir = join(
      process.cwd(),
      'uploads',
      'bookings',
      booking.projectId,
      booking.id,
    );
    mkdirSync(dir, { recursive: true });
    const filename = `${booking.bookingNumber}-form.pdf`;
    const absolutePath = join(dir, filename);
    const relativePath = `uploads/bookings/${booking.projectId}/${booking.id}/${filename}`;

    const buffer = await this.buildPdfBuffer(booking);
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  buildPdfBuffer(booking: PublicBooking): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).text('Unit Booking Form', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Booking Number: ${booking.bookingNumber}`);
      doc.text(`Status: ${booking.status}`);
      doc.text(
        `Booking Date: ${new Date(booking.bookingDate).toISOString().slice(0, 10)}`,
      );
      doc.text(`Customer Id: ${booking.customerId}`);
      if (booking.jointApplicantId) {
        doc.text(`Joint Applicant Id: ${booking.jointApplicantId}`);
      }
      doc.text(`Project Id: ${booking.projectId}`);
      doc.text(`Unit Id: ${booking.unitId}`);
      doc.text(`Funding Type: ${booking.fundingType}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Commercials');
      doc.font('Helvetica');
      doc.text(`Agreed Price: ${booking.agreedPrice.toFixed(2)}`);
      doc.text(`Discount: ${booking.discount.toFixed(2)}`);
      doc.text(`Approved Price: ${booking.approvedPrice.toFixed(2)}`);
      doc.text(`Booking Amount (Token): ${booking.bookingAmount.toFixed(2)}`);
      doc.moveDown();

      if (booking.paymentPlan.name || booking.paymentPlan.installments.length) {
        doc.font('Helvetica-Bold').text('Payment Plan');
        doc.font('Helvetica');
        if (booking.paymentPlan.name) {
          doc.text(`Plan: ${booking.paymentPlan.name}`);
        }
        for (const item of booking.paymentPlan.installments) {
          const due = item.dueDate
            ? new Date(item.dueDate).toISOString().slice(0, 10)
            : '-';
          doc.text(
            `${item.sequence}. ${item.label} | due ${due} | amount ${item.amount.toFixed(2)}${
              item.percent != null ? ` (${item.percent}%)` : ''
            }`,
          );
        }
        doc.moveDown();
      }

      if (booking.broker.name || booking.broker.firmName) {
        doc.font('Helvetica-Bold').text('Broker');
        doc.font('Helvetica');
        doc.text(`Name: ${booking.broker.name ?? '-'}`);
        doc.text(`Firm: ${booking.broker.firmName ?? '-'}`);
        doc.text(`Phone: ${booking.broker.phone ?? '-'}`);
        doc.moveDown();
      }

      if (booking.remarks) {
        doc.text(`Remarks: ${booking.remarks}`);
        doc.moveDown();
      }

      doc.moveDown(2);
      doc.text('Customer Signature: ____________________', { continued: false });
      doc.moveDown();
      doc.text('Authorized Signatory: ____________________');
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(
          'This booking form is subject to company terms, KYC completion, and payment as per the schedule. Holds expire automatically if not progressed.',
        );

      doc.end();
    });
  }
}
