import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { BankStatementImportService } from './bank-statement-import.service';

describe('BankStatementImportService', () => {
  const service = new BankStatementImportService();

  const mapping = {
    date: 'Txn Date',
    description: 'Narration',
    debit: 'Withdrawal',
    credit: 'Deposit',
    transactionId: 'Ref',
    chequeNumber: 'Cheque',
  };

  it('parses CSV with column mapping', async () => {
    const csv = [
      'Txn Date,Narration,Withdrawal,Deposit,Ref,Cheque',
      '2026-07-10,NEFT IN,0,5000,UTR123,',
      '2026-07-12,Cheque paid,1200,0,,CHQ-88',
    ].join('\n');

    const rows = await service.parseBuffer(
      Buffer.from(csv, 'utf8'),
      'stmt.csv',
      mapping,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].credit).toBe(5000);
    expect(rows[0].transactionId).toBe('UTR123');
    expect(rows[1].debit).toBe(1200);
    expect(rows[1].chequeNumber).toBe('CHQ-88');
  });

  it('parses Excel with column mapping', async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Statement');
    sheet.addRow([
      'Txn Date',
      'Narration',
      'Withdrawal',
      'Deposit',
      'Ref',
      'Cheque',
    ]);
    sheet.addRow(['2026-07-15', 'Interest', 0, 45, 'INT-1', '']);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    const rows = await service.parseBuffer(buffer, 'stmt.xlsx', mapping);
    expect(rows).toHaveLength(1);
    expect(rows[0].credit).toBe(45);
    expect(rows[0].transactionId).toBe('INT-1');
  });

  it('rejects mapping without amount columns', async () => {
    await expect(
      service.parseBuffer(Buffer.from('a'), 'a.csv', { date: 'D' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
