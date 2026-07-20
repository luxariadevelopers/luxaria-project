import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import '@/test/mockAuth';
import {
  DateInput,
  FormTextField,
  MoneyInput,
  applyServerFieldErrors,
} from './index';
import { isoDateOnlySchema, moneyNonNegativeSchema } from '@/validation';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: moneyNonNegativeSchema,
  reportDate: isoDateOnlySchema,
});

type Values = z.infer<typeof schema>;

function TestForm({
  onSubmit,
}: {
  onSubmit: (values: Values) => void;
}) {
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      amount: 0,
      reportDate: '',
    },
  });

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      spacing={1}
      data-testid="test-form"
    >
      <span data-testid="dirty">{isDirty ? 'dirty' : 'clean'}</span>
      <FormTextField name="title" control={control} label="Title" />
      <MoneyInput name="amount" control={control} label="Amount" />
      <DateInput name="reportDate" control={control} label="Report date" />
      <Button type="submit">Submit</Button>
      <Button
        type="button"
        onClick={() =>
          reset({
            title: '',
            amount: 0,
            reportDate: '',
          })
        }
      >
        Reset
      </Button>
      <Button
        type="button"
        onClick={() =>
          applyServerFieldErrors(setError, {
            title: 'Title already exists',
          })
        }
      >
        Apply server error
      </Button>
    </Stack>
  );
}

describe('form pattern (dirty / reset / submit / server errors)', () => {
  it('tracks dirty state, resets, submits valid values, and shows server field errors', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);

    expect(screen.getByTestId('dirty')).toHaveTextContent('clean');

    await user.type(screen.getByLabelText('Title'), 'Sample voucher');
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '1250.5');
    const date = screen.getByLabelText('Report date');
    await user.clear(date);
    await user.type(date, '2026-07-15');

    await waitFor(() => {
      expect(screen.getByTestId('dirty')).toHaveTextContent('dirty');
    });

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Sample voucher',
      amount: 1250.5,
      reportDate: '2026-07-15',
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => {
      expect(screen.getByTestId('dirty')).toHaveTextContent('clean');
    });
    expect(screen.getByLabelText('Title')).toHaveValue('');

    await user.click(
      screen.getByRole('button', { name: 'Apply server error' }),
    );
    expect(await screen.findByText('Title already exists')).toBeInTheDocument();
  });
});
