import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionChecklist } from './PermissionChecklist';

const catalog = [
  { code: 'user.view', module: 'user', action: 'view' },
  { code: 'user.update', module: 'user', action: 'update' },
  { code: 'role.view', module: 'role', action: 'view' },
];

describe('PermissionChecklist', () => {
  it('renders exact catalog codes and returns sorted replacements', () => {
    const onChange = vi.fn();
    render(
      <PermissionChecklist
        catalog={catalog}
        value={['user.view']}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('user.view')).toBeInTheDocument();
    expect(screen.getByText('user.update')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'user.update' }),
    );

    expect(onChange).toHaveBeenCalledWith(['user.update', 'user.view']);
  });

  it('filters without inventing permissions', () => {
    render(
      <PermissionChecklist
        catalog={catalog}
        value={[]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Filter permissions'), {
      target: { value: 'role.' },
    });

    expect(screen.getByText('role.view')).toBeInTheDocument();
    expect(screen.queryByText('user.view')).not.toBeInTheDocument();
  });

  it('disables permission changes for read-only access', () => {
    render(
      <PermissionChecklist
        catalog={catalog}
        value={['user.view']}
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'user.view' }),
    ).toBeDisabled();
    expect(
      screen.getAllByRole('button', { name: /module/i })[0],
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });

  it('selects and clears the full catalog', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PermissionChecklist
        catalog={catalog}
        value={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(onChange).toHaveBeenCalledWith([
      'role.view',
      'user.update',
      'user.view',
    ]);

    rerender(
      <PermissionChecklist
        catalog={catalog}
        value={['role.view', 'user.update', 'user.view']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('selects only matching permissions when filtered', () => {
    const onChange = vi.fn();
    render(
      <PermissionChecklist
        catalog={catalog}
        value={['user.view']}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Filter permissions'), {
      target: { value: 'role.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all matching' }),
    );

    expect(onChange).toHaveBeenCalledWith(['role.view', 'user.view']);
  });
});
