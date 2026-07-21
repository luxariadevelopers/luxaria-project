import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from './UserForm';
import { UserStatus, type PublicUser } from './types';

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
    const password = screen.getByLabelText(
      /initial password/i,
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

  it('never renders a stored or editable password in edit mode', () => {
    render(
      <UserForm mode="edit" initial={user} onSubmit={vi.fn()} />,
    );

    expect(
      screen.queryByLabelText(/initial password/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: /password/i }),
    ).not.toBeInTheDocument();
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
