import { Grid } from '@mui/material';
import { MetricCard } from './MetricCard';
import { formatInr, formatPercent } from '../format';

type CommitmentContributionCardsProps = {
  commitmentAmount: number;
  amountContributed: number;
  pendingContribution: number;
};

export function CommitmentContributionCards({
  commitmentAmount,
  amountContributed,
  pendingContribution,
}: CommitmentContributionCardsProps) {
  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <MetricCard
          title="Commitment"
          value={formatInr(commitmentAmount)}
          subtitle="Approved investment commitment"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <MetricCard
          title="Contributed"
          value={formatInr(amountContributed)}
          subtitle="Capital received to date"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <MetricCard
          title="Pending contribution"
          value={formatInr(pendingContribution)}
          subtitle="Outstanding against commitment"
        />
      </Grid>
    </>
  );
}

type ProfitShareCardProps = {
  approvedProfitSharePercentage: number;
};

export function ProfitShareCard({
  approvedProfitSharePercentage,
}: ProfitShareCardProps) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <MetricCard
        title="Profit share"
        value={formatPercent(approvedProfitSharePercentage)}
        subtitle="Your approved profit share"
      />
    </Grid>
  );
}

type ProgressCardProps = {
  physicalProgressPercent: number;
  plannedQuantity?: number;
  measuredQuantity?: number;
};

export function ProgressCard({
  physicalProgressPercent,
  plannedQuantity,
  measuredQuantity,
}: ProgressCardProps) {
  const detail =
    plannedQuantity != null && measuredQuantity != null
      ? `${measuredQuantity.toLocaleString('en-IN')} / ${plannedQuantity.toLocaleString('en-IN')} measured`
      : 'Physical construction progress';

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <MetricCard
        title="Physical progress"
        value={formatPercent(physicalProgressPercent)}
        subtitle={detail}
      />
    </Grid>
  );
}

type UtilisationCardProps = {
  approvedBudget: number;
  revisedBudget: number;
  fundsUtilised: number;
  utilisationPercent: number;
};

export function UtilisationCard({
  approvedBudget,
  revisedBudget,
  fundsUtilised,
  utilisationPercent,
}: UtilisationCardProps) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <MetricCard
        title="Budget utilisation"
        value={formatPercent(utilisationPercent)}
        subtitle={`${formatInr(fundsUtilised)} of ${formatInr(revisedBudget || approvedBudget)} utilised`}
      />
    </Grid>
  );
}
