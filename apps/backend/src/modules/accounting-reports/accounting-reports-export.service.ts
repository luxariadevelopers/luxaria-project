import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { AccountingExportFormat } from './accounting-reports.constants';
import { AccountingReportType } from './accounting-reports.constants';
import { AccountingReportsService } from './accounting-reports.service';
import type { AccountingReportPayload } from './accounting-reports.types';
import type { AccountingReportsQueryDto } from './dto/accounting-reports-query.dto';

@Injectable()
export class AccountingReportsExportService {
  constructor(private readonly reportsService: AccountingReportsService) {}

  async export(
    reportType: AccountingReportType,
    query: AccountingReportsQueryDto,
    format: AccountingExportFormat,
    actorId: string,
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const result = await this.reportsService.getReport(
      reportType,
      query,
      actorId,
    );
    const payload = result.data as AccountingReportPayload;
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `accounting-${reportType}-${stamp}`;

    if (format === 'pdf') {
      const buffer = await this.toPdf(payload);
      return {
        filename: `${baseName}.pdf`,
        contentType: 'application/pdf',
        buffer,
      };
    }

    const buffer = await this.toExcel(payload);
    return {
      filename: `${baseName}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }

  private async toExcel(payload: AccountingReportPayload): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Luxaria ERP';
    const sheet = workbook.addWorksheet(payload.meta.title.slice(0, 31));

    sheet.addRow(['Report', payload.meta.title]);
    sheet.addRow(['Generated at', payload.meta.generatedAt]);
    sheet.addRow(['Reconciled', payload.meta.reconciled ? 'Yes' : 'No']);
    sheet.addRow([
      'Financial year',
      payload.meta.filters.financialYearName ?? '',
    ]);
    sheet.addRow(['Project', payload.meta.filters.projectName ?? '']);
    sheet.addRow(['From', payload.meta.filters.from ?? '']);
    sheet.addRow(['To', payload.meta.filters.to ?? '']);
    sheet.addRow([]);

    if (payload.totals) {
      sheet.addRow(['Totals']);
      for (const [key, value] of Object.entries(payload.totals)) {
        sheet.addRow([key, value]);
      }
      sheet.addRow([]);
    }

    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (rows.length) {
      const keys = Object.keys(rows[0] as object).filter(
        (k) => k !== 'drillDown',
      );
      sheet.addRow(keys);
      sheet.getRow(sheet.rowCount).font = { bold: true };
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        sheet.addRow(keys.map((k) => this.cellValue(r[k])));
      }
    } else if (payload.sections && typeof payload.sections === 'object') {
      sheet.addRow(['Section data (JSON)']);
      sheet.addRow([JSON.stringify(payload.sections)]);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async toPdf(payload: AccountingReportPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text(payload.meta.title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Generated: ${payload.meta.generatedAt}`);
      doc.text(`Reconciled: ${payload.meta.reconciled ? 'Yes' : 'No'}`);
      if (payload.meta.filters.financialYearName) {
        doc.text(`Financial year: ${payload.meta.filters.financialYearName}`);
      }
      if (payload.meta.filters.projectName) {
        doc.text(`Project: ${payload.meta.filters.projectName}`);
      }
      if (payload.meta.filters.from || payload.meta.filters.to) {
        doc.text(
          `Period: ${payload.meta.filters.from ?? '…'} → ${payload.meta.filters.to ?? '…'}`,
        );
      }
      for (const note of payload.meta.reconciliationNotes ?? []) {
        doc.fillColor('#884400').text(`Note: ${note}`);
        doc.fillColor('#000000');
      }
      doc.moveDown();

      if (payload.totals) {
        doc.fontSize(12).text('Totals', { underline: true });
        doc.fontSize(10);
        for (const [key, value] of Object.entries(payload.totals)) {
          doc.text(`${key}: ${value}`);
        }
        doc.moveDown();
      }

      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      if (rows.length) {
        doc.fontSize(12).text('Lines', { underline: true });
        doc.fontSize(8);
        const max = Math.min(rows.length, 80);
        for (let i = 0; i < max; i++) {
          const r = rows[i] as Record<string, unknown>;
          const line = [
            r.accountCode ?? r.journalNumber ?? r.partyName ?? '',
            r.accountName ?? r.narration ?? '',
            r.debit != null ? `Dr ${r.debit}` : '',
            r.credit != null ? `Cr ${r.credit}` : '',
            r.amount != null ? `Amt ${r.amount}` : '',
            r.total != null ? `Tot ${r.total}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          doc.text(line, { width: 520 });
          if (doc.y > 750) {
            doc.addPage();
          }
        }
        if (rows.length > max) {
          doc.text(`… and ${rows.length - max} more rows`);
        }
      } else if (payload.sections) {
        doc.fontSize(10).text(JSON.stringify(payload.sections, null, 2), {
          width: 520,
        });
      }

      doc.end();
    });
  }

  private cellValue(value: unknown): string | number | boolean | Date | null {
    if (value == null) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      return value;
    }
    return JSON.stringify(value);
  }
}
