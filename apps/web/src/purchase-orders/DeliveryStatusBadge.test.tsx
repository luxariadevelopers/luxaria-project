import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { PurchaseOrderStatus } from './types';

describe('DeliveryStatusBadge', () => {
  it('renders partially received badge', () => {
    render(
      <DeliveryStatusBadge status={PurchaseOrderStatus.PartiallyReceived} />,
    );
    const chip = screen.getByTestId('po-delivery-badge-partially-received');
    expect(chip).toHaveTextContent('Partially received');
  });

  it('renders fully received badge', () => {
    render(
      <DeliveryStatusBadge status={PurchaseOrderStatus.FullyReceived} />,
    );
    const chip = screen.getByTestId('po-delivery-badge-fully-received');
    expect(chip).toHaveTextContent('Fully received');
  });

  it('renders awaiting delivery for issued', () => {
    render(<DeliveryStatusBadge status={PurchaseOrderStatus.Issued} />);
    expect(screen.getByTestId('po-delivery-badge-awaiting')).toHaveTextContent(
      'Awaiting delivery',
    );
  });

  it('renders empty placeholder for draft', () => {
    render(<DeliveryStatusBadge status={PurchaseOrderStatus.Draft} />);
    expect(screen.getByTestId('po-delivery-badge-empty')).toHaveTextContent(
      '—',
    );
  });
});
