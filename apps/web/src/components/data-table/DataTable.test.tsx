import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GridColDef } from '@mui/x-data-grid';
import '@/test/mockAuth';
import { DataTable } from './DataTable';


type Row = { id: string; name: string; amount: number };

const columns: GridColDef<Row>[] = [
  { field: 'name', headerName: 'Name', width: 160 },
  { field: 'amount', headerName: 'Amount', width: 120 },
];

const rows: Row[] = [
  { id: '1', name: 'Alpha', amount: 100 },
  { id: '2', name: 'Beta', amount: 200 },
];

describe('DataTable', () => {
  it('shows loading state', () => {
    render(
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
    render(
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

  it('shows error panel with retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
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
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('fires pagination callbacks (server mode)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
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
    await user.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);

    // Change page size via the rows-per-page select if present
    const comboboxes = screen.queryAllByRole('combobox');
    if (comboboxes.length > 0) {
      await user.click(comboboxes[comboboxes.length - 1]);
      const listbox = await screen.findByRole('listbox');
      const option = within(listbox).queryByRole('option', { name: '20' });
      if (option) {
        await user.click(option);
        expect(onPageSizeChange).toHaveBeenCalledWith(20);
      }
    }
  });
});
