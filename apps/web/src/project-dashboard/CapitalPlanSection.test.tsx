import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CapitalPlanSummary } from '@/director-command-centre/projectDashboardTypes';
import { CapitalPlanSection } from './CapitalPlanSection';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
  }),
}));

function wrap(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const emptyPlan: CapitalPlanSummary = {
  approvedBudget: 10_000_000,
  totalInvested: 0,
  pendingToInvest: 10_000_000,
  equalDirectorInvestment: true,
  directorsEqual: false,
  directors: [],
  investors: [],
  drillDown: [],
};

describe('CapitalPlanSection', () => {
  it('renders KPIs and empty-state without investor table', () => {
    wrap(<CapitalPlanSection plan={emptyPlan} />);

    expect(screen.getByTestId('capital-plan-section')).toBeInTheDocument();
    expect(screen.getByText(/invested till now/i)).toBeInTheDocument();
    expect(screen.getByText(/pending vs approved budget/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no capital participants yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Investors')).not.toBeInTheDocument();
  });

  it('renders directors and omits investors when none', () => {
    wrap(
      <CapitalPlanSection
        plan={{
          ...emptyPlan,
          totalInvested: 1_000_000,
          pendingToInvest: 9_000_000,
          directorsEqual: true,
          directors: [
            {
              participantRecordId: 'r1',
              partyId: 'd1',
              name: 'Director A',
              profitSharePercent: 50,
              expectedAmount: 5_000_000,
              investedAmount: 1_000_000,
              pendingAmount: 4_000_000,
              budgetPercent: null,
              instrumentType: null,
              repaymentMode: null,
              interestRate: null,
              repayHint: null,
            },
            {
              participantRecordId: 'r2',
              partyId: 'd2',
              name: 'Director B',
              profitSharePercent: 50,
              expectedAmount: 5_000_000,
              investedAmount: 0,
              pendingAmount: 5_000_000,
              budgetPercent: null,
              instrumentType: null,
              repaymentMode: null,
              interestRate: null,
              repayHint: null,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Directors')).toBeInTheDocument();
    expect(screen.getByText('Director A')).toBeInTheDocument();
    expect(screen.getByText('Director B')).toBeInTheDocument();
    expect(screen.queryByText('Investors')).not.toBeInTheDocument();
    expect(
      screen.getByText(/director expected investments are equal/i),
    ).toBeInTheDocument();
  });

  it('renders investor repayment terms when present', () => {
    wrap(
      <CapitalPlanSection
        plan={{
          ...emptyPlan,
          equalDirectorInvestment: false,
          directors: [
            {
              participantRecordId: 'r1',
              partyId: 'd1',
              name: 'Director A',
              profitSharePercent: 80,
              expectedAmount: 8_000_000,
              investedAmount: 0,
              pendingAmount: 8_000_000,
              budgetPercent: null,
              instrumentType: null,
              repaymentMode: null,
              interestRate: null,
              repayHint: null,
            },
          ],
          investors: [
            {
              participantRecordId: 'r3',
              partyId: 'i1',
              name: 'Investor X',
              profitSharePercent: 0,
              expectedAmount: 2_000_000,
              investedAmount: 500_000,
              pendingAmount: 1_500_000,
              budgetPercent: 20,
              instrumentType: 'unsecured_loan',
              repaymentMode: 'with_interest',
              interestRate: 12,
              repayHint: 'Principal ₹2,000,000 + interest at 12% p.a.',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Investors')).toBeInTheDocument();
    expect(screen.getByText('Investor X')).toBeInTheDocument();
    expect(
      screen.getByText(/principal ₹2,000,000 \+ interest at 12% p\.a\./i),
    ).toBeInTheDocument();
  });
});
