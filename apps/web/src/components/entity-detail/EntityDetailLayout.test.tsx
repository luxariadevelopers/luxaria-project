import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { luxariaTheme } from '@/theme/theme';
import { DetailHeader } from './DetailHeader';
import { EntityActionBar } from './EntityActionBar';
import { EntityDetailLayout } from './EntityDetailLayout';
import { EntityDetailTabs } from './EntityDetailTabs';
import { StatusStrip } from './StatusStrip';
import { SummaryCards } from './SummaryCards';
import type { EntityDetailAction } from './types';

function wrap(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={luxariaTheme}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );
}

describe('EntityDetailLayout states', () => {
  it('shows permission denied when canView is false', () => {
    wrap(
      <EntityDetailLayout
        canView={false}
        permissionMessage="Need purchase.view"
      />,
    );
    expect(screen.getByText('Need purchase.view')).toBeInTheDocument();
  });

  it('shows project required when projectReady is false', () => {
    wrap(<EntityDetailLayout canView projectReady={false} />);
    expect(screen.getByText('Project required')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    wrap(<EntityDetailLayout canView loading />);
    expect(screen.getByTestId('entity-detail-loading')).toBeInTheDocument();
  });

  it('shows retry panel on error', () => {
    const onRetry = vi.fn();
    wrap(
      <EntityDetailLayout
        canView
        error={new Error('boom')}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText(/boom|failed|error/i)).toBeTruthy();
  });

  it('shows not found empty state', () => {
    wrap(<EntityDetailLayout canView notFound />);
    expect(screen.getByText('Record not found')).toBeInTheDocument();
  });

  it('renders composed IA slots', () => {
    wrap(
      <EntityDetailLayout
        canView
        header={<DetailHeader title="Purchase order" code="PO-100" />}
        statusStrip={
          <StatusStrip status="draft" domainKey="purchaseOrder" />
        }
        summary={
          <SummaryCards
            fields={[{ id: 'amt', label: 'Amount', value: '₹1,000.00' }]}
          />
        }
      />,
    );
    expect(screen.getByTestId('entity-detail-layout')).toBeInTheDocument();
    expect(screen.getByText('Purchase order')).toBeInTheDocument();
    expect(screen.getByText('PO-100')).toBeInTheDocument();
    expect(screen.getByTestId('entity-status-strip')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });
});

describe('EntityActionBar', () => {
  const actions: EntityDetailAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      permission: 'purchase.order',
      allowedStatuses: ['draft'],
      onClick: vi.fn(),
    },
    {
      id: 'approve',
      label: 'Approve',
      permission: 'purchase.approve',
      allowedStatuses: ['pending_approval'],
      onClick: vi.fn(),
    },
  ];

  it('shows only status+permission matching actions', () => {
    wrap(
      <EntityActionBar
        actions={actions}
        status="draft"
        hasPermission={(p) => p === 'purchase.order'}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
  });

  it('invokes onClick for a visible action', () => {
    const onClick = vi.fn();
    wrap(
      <EntityActionBar
        actions={[{ ...actions[0]!, onClick }]}
        status="draft"
        hasPermission={() => true}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders sticky action bar chrome', () => {
    wrap(
      <EntityActionBar
        actions={actions}
        status="draft"
        hasPermission={() => true}
      />,
    );
    expect(screen.getByTestId('entity-action-bar')).toBeInTheDocument();
  });
});

describe('EntityDetailTabs', () => {
  it('hides tabs that require missing permissions', () => {
    wrap(
      <EntityDetailTabs
        hasPermission={(p) => p === 'purchase.view'}
        tabs={[
          { id: 'overview', label: 'Overview', content: <div>Overview body</div> },
          {
            id: 'audit',
            label: 'Audit',
            permission: 'audit.view',
            content: <div>Audit body</div>,
          },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Audit' })).not.toBeInTheDocument();
    expect(screen.getByText('Overview body')).toBeInTheDocument();
  });
});
