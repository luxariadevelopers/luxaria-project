import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { PublicQuotationComparison } from './quotation-comparisons.mapper';

@Injectable()
export class QuotationComparisonPdfService {
  /**
   * Generates a comparison statement PDF and returns the relative path.
   */
  async generate(comparison: PublicQuotationComparison): Promise<string> {
    const id = comparison.id;
    const dir = join(process.cwd(), 'uploads', 'quotation-comparisons', id);
    mkdirSync(dir, { recursive: true });
    const filename = `${comparison.comparisonNumber}.pdf`;
    const absolutePath = join(dir, filename);
    const relativePath = `uploads/quotation-comparisons/${id}/${filename}`;

    const buffer = await this.buildPdfBuffer(comparison);
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  buildPdfBuffer(comparison: PublicQuotationComparison): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(16)
        .text('Luxaria Developers Pvt. Ltd.', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).text('Quotation Comparison Statement', {
        align: 'center',
      });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Comparison No: ${comparison.comparisonNumber}`);
      doc.text(`Purchase Request Id: ${comparison.purchaseRequestId}`);
      doc.text(`Project Id: ${comparison.projectId}`);
      doc.text(`Status: ${comparison.status}`);
      doc.text(
        `Generated: ${new Date(comparison.generatedAt).toISOString().slice(0, 10)}`,
      );
      doc.moveDown();

      const headers = [
        'Vendor',
        'Base Rate',
        'GST',
        'Freight',
        'Discount',
        'Landed',
        'Days',
        'Terms',
        'Rating',
        'Quality',
        'Delivery',
      ];
      const colWidths = [90, 60, 55, 55, 55, 65, 40, 70, 45, 50, 55];
      let x = doc.x;
      const startY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, x, startY, { width: colWidths[i], continued: false });
        x += colWidths[i]!;
      });
      doc.moveDown(0.8);
      doc.font('Helvetica');

      for (const v of comparison.vendors) {
        const y = doc.y;
        let cx = 40;
        const cells = [
          v.vendorName ?? v.vendorCode ?? v.vendorId.slice(-6),
          String(v.baseMaterialRate),
          String(v.gst),
          String(v.freight),
          String(v.discount),
          String(v.netLandedCost),
          String(v.deliveryDays),
          (v.paymentTerms ?? '-').slice(0, 12),
          v.vendorRating == null ? '-' : String(v.vendorRating),
          v.previousQuality == null ? '-' : String(v.previousQuality),
          v.previousDeliveryPerformance == null
            ? '-'
            : String(v.previousDeliveryPerformance),
        ];
        cells.forEach((cell, i) => {
          const label =
            (v.isRecommended ? '* ' : '') +
            (v.isLowestLandedCost && i === 0 ? '[L] ' : '') +
            cell;
          doc.text(i === 0 ? label : cell, cx, y, {
            width: colWidths[i],
            continued: false,
          });
          cx += colWidths[i]!;
        });
        doc.moveDown(0.7);
      }

      doc.moveDown();
      doc.fontSize(9);
      if (comparison.recommendedQuotationId) {
        doc.text(
          `Recommended quotation: ${comparison.recommendedQuotationId}` +
            (comparison.isLowestVendorSelected
              ? ' (lowest landed cost)'
              : ' (not lowest landed cost)'),
        );
      }
      if (comparison.recommendationReason) {
        doc.text(`Reason: ${comparison.recommendationReason}`);
      }
      doc.moveDown();
      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(
          '[L] = lowest net landed cost. * = recommended. Previous quality/delivery scores are historical inputs until GRN analytics are available.',
        );

      doc.end();
    });
  }
}
