import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { luxariaTheme } from '@/theme/theme';
import { AuditDiffView } from './AuditDiffView';

describe('AuditDiffView', () => {
  it('renders field-level before/after changes', () => {
    render(
      <ThemeProvider theme={luxariaTheme}>
        <AuditDiffView
          beforeData={{ name: 'Old', amount: 1 }}
          afterData={{ name: 'New', amount: 1, flag: true }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('audit-diff-view')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('flag')).toBeInTheDocument();
    expect(screen.getByText(/field changes/i)).toBeInTheDocument();
  });

  it('handles large JSON via expand / raw truncated views', async () => {
    const user = userEvent.setup();
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (let i = 0; i < 120; i += 1) {
      before[`k${i}`] = 'x'.repeat(80);
      after[`k${i}`] = 'y'.repeat(80);
    }

    render(
      <ThemeProvider theme={luxariaTheme}>
        <AuditDiffView beforeData={before} afterData={after} compact />
      </ThemeProvider>,
    );

    expect(screen.getByText('Diff truncated')).toBeInTheDocument();
    expect(screen.getByText(/field changes/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Show raw JSON/i }));
    expect(screen.getAllByText(/Before/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/After/).length).toBeGreaterThan(0);
  });
});
