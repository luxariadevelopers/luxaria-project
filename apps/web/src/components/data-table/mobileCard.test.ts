import { describe, expect, it } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import {
  getMobileCellText,
  resolveMobileCardFields,
} from './mobileCard';

type Row = { id: string; name: string; amount: number; status: string };

const columns: GridColDef<Row>[] = [
  { field: 'name', headerName: 'Name', width: 160 },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 120,
    valueGetter: (_v, row) => `₹${row.amount}`,
  },
  { field: 'status', headerName: 'Status', width: 120 },
  { field: 'id', headerName: 'Id', width: 80 },
];

describe('resolveMobileCardFields', () => {
  it('infers primary, two meta, and status', () => {
    expect(resolveMobileCardFields(columns)).toEqual({
      primaryField: 'name',
      metaFields: ['amount', 'id'],
      statusField: 'status',
    });
  });

  it('honours explicit config', () => {
    expect(
      resolveMobileCardFields(columns, {
        primaryField: 'id',
        metaFields: ['name'],
        statusField: 'status',
      }),
    ).toEqual({
      primaryField: 'id',
      metaFields: ['name'],
      statusField: 'status',
    });
  });

  it('returns null when disabled', () => {
    expect(resolveMobileCardFields(columns, { disabled: true })).toBeNull();
  });
});

describe('getMobileCellText', () => {
  it('uses valueGetter when present', () => {
    const row: Row = { id: '1', name: 'Alpha', amount: 100, status: 'open' };
    expect(getMobileCellText(columns, 'amount', row)).toBe('₹100');
    expect(getMobileCellText(columns, 'name', row)).toBe('Alpha');
  });
});
