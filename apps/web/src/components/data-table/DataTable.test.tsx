import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';
import '@/test/mockAuth';
import { luxariaTheme } from '@/theme/theme';
import { DataTable } from './DataTable';

type Row = { id: string; name: string; amount: number; status: string };

const columns: GridColDef<Row>[] = [
  { field: 'name', headerName: 'Name', width: 160 },
  { field: 'amount', headerName: 'Amount', width: 120 },
  { field: 'status', headerName: 'Status', width: 120 },
];

const rows: Row[] = [
  { id: '1', name: 'Alpha', amount: 100, status: 'open' },
  { id: '2', name: 'Beta', amount: 200, status: 'closed' },
];

function renderTable(ui: ReactElement) {
  return render(<ThemeProvider theme={luxariaTheme}>{ui}</ThemeProvider>);
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  stubMatchMedia(false);
});

describe('DataTable', () => {
  it('shows loading state', () => {
    renderTable(
      <DataTable
        title="Items"
        rows={rows}
        columns={columns}
        loading
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText('Items')).toBeInTheDocument();
    // MUI DataGrid exposes a progressbar while loading
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when there are no rows', () => {
    renderTable(
      <DataTable
        rows={[]}
        columns={columns}
        emptyTitle="No items"
        emptyDescription="Nothing here yet."
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('shows error panel with retry', () => {
    const onRetry = vi.fn();
    renderTable(
      <DataTable
        rows={rows}
        columns={columns}
        error={{
          isAxiosError: true,
          response: {
            status: 500,
            data: {
              success: false,
              errorCode: 'INTERNAL_ERROR',
              message: 'Boom',
              details: [],
              requestId: 'r1',
              timestamp: 't',
            },
          },
        }}
        onRetry={onRetry}
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders card rows below sm', () => {
    stubMatchMedia(true);
    renderTable(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        paginationMode="client"
        page={1}
        pageSize={20}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('data-table-mobile-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('data-table-mobile-row')).toHaveLength(2);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('fires pagination callbacks (server mode)', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    renderTable(
      <DataTable
        rows={rows}
        columns={columns}
        paginationMode="server"
        page={1}
        pageSize={10}
        rowCount={40}
        pageSizeOptions={[10, 20]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        getRowId={(r) => r.id}
        height={360}
      />,
    );

    // Next page button in DataGrid footer
    const next = screen.getByRole('button', { name: /go to next page/i });
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);

    // Change page size via the rows-per-page select if present
    const comboboxes = screen.queryAllByRole('combobox');
    if (comboboxes.length > 0) {
      fireEvent.mouseDown(comboboxes[comboboxes.length - 1]!);
      const listbox = screen.queryByRole('listbox');
      const option = listbox
        ? within(listbox).queryByRole('option', { name: '20' })
        : null;
      if (option) {
        fireEvent.click(option);
        expect(onPageSizeChange).toHaveBeenCalledWith(20);
      }
    }
  });
});
