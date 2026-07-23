import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from './UserForm';
import {
  ReportingApprovalMode,
  UserStatus,
  type PublicUser,
} from './types';

const user: PublicUser = {
  id: '507f1f77bcf86cd799439011',
  userCode: 'USR-000001',
  fullName: 'Existing User',
  email: 'existing@example.com',
  mobile: null,
  employeeId: null,
  designation: null,
  department: null,
  profilePhoto: null,
  status: UserStatus.Active,
  assignedProjects: [],
  roleIds: [],
  reportingManager: null,
  reportingOfficers: [],
  reportingApprovalMode: ReportingApprovalMode.Any,
  joiningDate: null,
  lastLoginAt: null,
};

describe('UserForm', () => {
  it('masks the create password and clears it immediately after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UserForm mode="create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByLabelText(/email \(login\)/i), {
      target: { value: 'new@example.com' },
    });
    const password = screen.getByLabelText(
      /initial temporary password/i,
    ) as HTMLInputElement;
    expect(password.type).toBe('password');
    fireEvent.change(password, {
      target: { value: 'Temporary123!' },
    });
    fireEvent.submit(screen.getByTestId('user-form'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].password).toBe('Temporary123!');
    await waitFor(() => expect(password.value).toBe(''));
  });

  it('allows an optional temporary password in edit mode', () => {
    render(
      <UserForm mode="edit" initial={user} onSubmit={vi.fn()} />,
    );

    expect(
      screen.queryByLabelText(/initial temporary password/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/set \/ reset temporary password/i),
    ).toBeInTheDocument();
  });

  it('shows reporting officers controls', () => {
    render(
      <UserForm
        mode="edit"
        initial={user}
        managerOptions={[
          {
            ...user,
            id: '507f1f77bcf86cd799439012',
            fullName: 'Director One',
            userCode: 'USR-000002',
          },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('reporting-officers-section')).toBeInTheDocument();
    expect(screen.getByLabelText(/reporting officers/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/primary reporting officer/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/approval rule/i)).toBeInTheDocument();
  });

  it('allows empty reporting when no other users exist yet', () => {
    render(
      <UserForm mode="edit" initial={user} managerOptions={[]} onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByText(/no other active users to assign yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not required for top-level roles/i),
    ).toBeInTheDocument();
  });

  it('shows validation errors before submitting invalid create data', async () => {
    const onSubmit = vi.fn();
    render(<UserForm mode="create" onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByTestId('user-form'));

    expect(
      await screen.findByText('Full name is required'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
