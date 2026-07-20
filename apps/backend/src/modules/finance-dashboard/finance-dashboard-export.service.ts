import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { FinanceDashboardQueryDto } from './dto/finance-dashboard-query.dto';
import { FinanceDashboardService } from './finance-dashboard.service';

@Injectable()
export class FinanceDashboardExportService {
  constructor(private readonly financeDashboardService: FinanceDashboardService) {}

  async export(
    query: FinanceDashboardQueryDto,
    actorId: string,
    format: 'csv' | 'xlsx' = 'xlsx',
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const { rows, summary } = await this.financeDashboardService.buildExportRows(
      query,
      actorId,
    );
    const stamp = summary.filters.date.slice(0, 10);

    if (format === 'csv') {
      const lines = ['section,metric,value'];
      for (const row of rows) {
        lines.push(
          [
            this.csvEscape(row.section),
            this.csvEscape(row.metric),
            this.csvEscape(String(row.value)),
          ].join(','),
        );
      }
      return {
        filename: `finance-dashboard-${stamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from(lines.join('\n'), 'utf8'),
      };
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Luxaria ERP';
    const sheet = workbook.addWorksheet('Finance Dashboard');
    sheet.columns = [
      { header: 'Section', key: 'section', width: 22 },
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(row);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      filename: `finance-dashboard-${stamp}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }

  private csvEscape(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
