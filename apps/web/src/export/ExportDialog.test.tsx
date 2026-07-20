import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { luxariaTheme } from '@/theme/theme';
import { ExportDialog } from './ExportDialog';
import type { ExportDescriptor } from './types';

const authState = vi.hoisted(() => ({
  permissions: ['report.export'] as string[],
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (p: string) => authState.permissions.includes(p),
  }),
}));

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('./downloadBlob', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

function wrap(ui: ReactElement) {
  return render(
    <ThemeProvider theme={luxariaTheme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>,
  );
}

function descriptor(
  overrides: Partial<ExportDescriptor> = {},
): ExportDescriptor {
  return {
    id: 'demo',
    title: 'Export trial balance',
    permission: 'report.export',
    allowedFormats: ['xlsx', 'csv'],
    defaultFormat: 'xlsx',
    showDateRange: true,
    fallbackFilename: 'trial.xlsx',
    fetchBinary: vi.fn(async () => ({
      blob: new Blob([new Uint8Array([1])], { type: 'text/csv' }),
      filename: 'trial.xlsx',
      contentType: 'text/csv',
    })),
    ...overrides,
  };
}

describe('ExportDialog', () => {
  beforeEach(() => {
    authState.permissions = ['report.export'];
    downloadBlob.mockReset();
  });

  it('downloads binary on success', async () => {
    const user = userEvent.setup();
    const desc = descriptor();
    wrap(<ExportDialog open onClose={() => {}} descriptor={desc} />);

    await user.click(screen.getByRole('button', { name: /^Export$/i }));

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'trial.xlsx',
      );
    });
    expect(screen.getByText(/Downloaded/i)).toBeInTheDocument();
  });

  it('surfaces API error responses with retry', async () => {
    const user = userEvent.setup();
    const desc = descriptor({
      fetchBinary: vi.fn(async () => {
        throw { success: false, message: 'Export upstream failed' };
      }),
    });
    wrap(<ExportDialog open onClose={() => {}} descriptor={desc} />);

    await user.click(screen.getByRole('button', { name: /^Export$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Export upstream failed/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('shows permission denied when report.export is missing', () => {
    authState.permissions = [];
    wrap(
      <ExportDialog open onClose={() => {}} descriptor={descriptor()} />,
    );
    expect(screen.getByText(/Missing permission report\.export/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Export$/i })).toBeDisabled();
  });
});
