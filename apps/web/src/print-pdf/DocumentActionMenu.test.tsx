import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { luxariaTheme } from '@/theme/theme';
import { DocumentActionMenu } from './DocumentActionMenu';
import type { PdfActionSource } from './types';

const authState = vi.hoisted(() => ({
  permissions: ['document.download', 'purchase.view', 'report.export'] as string[],
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (p: string) => authState.permissions.includes(p),
    hasAnyPermission: (ps: string[]) =>
      ps.some((p) => authState.permissions.includes(p)),
    hasAllPermissions: (ps: string[]) =>
      ps.every((p) => authState.permissions.includes(p)),
  }),
}));

const resolveMocks = vi.hoisted(() => ({
  resolvePdfSource: vi.fn(),
  resolvePdfSourceFresh: vi.fn(),
}));

vi.mock('./resolvePdf', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolvePdfSource: resolveMocks.resolvePdfSource,
    resolvePdfSourceFresh: resolveMocks.resolvePdfSourceFresh,
  };
});

function wrap(ui: ReactElement) {
  return render(
    <ThemeProvider theme={luxariaTheme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>,
  );
}

function documentSource(
  overrides: Partial<Extract<PdfActionSource, { kind: 'document' }>> = {},
): PdfActionSource {
  return {
    kind: 'document',
    label: 'Voucher PDF',
    documentId: '507f1f77bcf86cd799439011',
    requiresDocumentDownload: true,
    ...overrides,
  };
}

describe('DocumentActionMenu', () => {
  beforeEach(() => {
    authState.permissions = [
      'document.download',
      'purchase.view',
      'report.export',
    ];
    resolveMocks.resolvePdfSource.mockReset();
    resolveMocks.resolvePdfSourceFresh.mockReset();
    vi.spyOn(window, 'open').mockReset();
  });

  it('surfaces API failure with retry in the preview dialog', async () => {
    const user = userEvent.setup();
    resolveMocks.resolvePdfSource.mockRejectedValueOnce(new Error('Network down'));

    wrap(
      <DocumentActionMenu source={documentSource()} canViewEntity />,
    );

    await user.click(screen.getByRole('button', { name: /PDF/i }));
    await user.click(screen.getByRole('menuitem', { name: /Preview/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network down/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('shows popup-blocked message when download is blocked', async () => {
    const user = userEvent.setup();
    resolveMocks.resolvePdfSource.mockResolvedValueOnce({
      mode: 'url',
      url: 'https://example.test/file.pdf',
      filename: 'file.pdf',
    });
    vi.spyOn(window, 'open').mockReturnValue(null);

    wrap(
      <DocumentActionMenu source={documentSource()} canViewEntity />,
    );

    await user.click(screen.getByRole('button', { name: /PDF/i }));
    await user.click(screen.getByRole('menuitem', { name: /Download/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pop-up blocked/i)).toBeInTheDocument();
    });
  });

  it('disables actions when entity view permission is missing', async () => {
    wrap(
      <DocumentActionMenu source={documentSource()} canViewEntity={false} />,
    );
    expect(screen.getByRole('button', { name: /PDF/i })).toBeDisabled();
  });

  it('shows unavailable reason for unsupported GRN source', async () => {
    const user = userEvent.setup();
    const source: PdfActionSource = {
      kind: 'unavailable',
      label: 'GRN documents',
      reason: 'Goods receipts have no PDF export endpoint.',
    };

    wrap(<DocumentActionMenu source={source} canViewEntity />);

    await user.click(screen.getByRole('button', { name: /PDF/i }));
    expect(
      screen.getByText(/Goods receipts have no PDF export endpoint/i),
    ).toBeInTheDocument();
  });
});
