import { useQuery } from '@tanstack/react-query';
import { fetchCommitmentSummary, fetchCommitments } from '@/commitments/api';
import { CommitmentStatus } from '@/commitments/types';
import { fetchContributionBalances } from '@/contribution-receipts/api';
import { fetchActiveParticipants } from '@/project-participants/api';
import { fetchSourceAndUtilisation } from './api';
import {
  aggregateParticipantFunding,
  buildFundingCards,
  periodFromForDate,
} from './deriveFunding';
import { fundingDashboardKeys } from './queryKeys';

export function useFundingDashboard(args: {
  projectId: string | null;
  date: string;
  canCommitments: boolean;
  canUtilisation: boolean;
  canBalances: boolean;
}) {
  const enabled =
    Boolean(args.projectId) &&
    Boolean(args.date) &&
    (args.canCommitments || args.canUtilisation || args.canBalances);

  const summaryQuery = useQuery({
    queryKey: [
      ...fundingDashboardKeys.board(args.projectId ?? '', args.date),
      'summary',
    ],
    queryFn: () => fetchCommitmentSummary(args.projectId!),
    enabled: enabled && args.canCommitments,
    staleTime: 15_000,
    retry: false,
  });

  const commitmentsQuery = useQuery({
    queryKey: [
      ...fundingDashboardKeys.board(args.projectId ?? '', args.date),
      'commitments',
    ],
    queryFn: () =>
      fetchCommitments(args.projectId!, {
        page: 1,
        limit: 100,
        status: CommitmentStatus.Approved,
      }),
    enabled: enabled && args.canCommitments,
    staleTime: 15_000,
    retry: false,
  });

  const participantsQuery = useQuery({
    queryKey: [
      ...fundingDashboardKeys.board(args.projectId ?? '', args.date),
      'participants',
    ],
    queryFn: () => fetchActiveParticipants(args.projectId!),
    enabled: enabled && args.canCommitments,
    staleTime: 30_000,
    retry: false,
  });

  const balancesQuery = useQuery({
    queryKey: [
      ...fundingDashboardKeys.board(args.projectId ?? '', args.date),
      'balances',
    ],
    queryFn: () => fetchContributionBalances(args.projectId!),
    enabled: enabled && args.canBalances,
    staleTime: 15_000,
    retry: false,
  });

  const utilisationQuery = useQuery({
    queryKey: [
      ...fundingDashboardKeys.board(args.projectId ?? '', args.date),
      'utilisation',
      periodFromForDate(args.date),
    ],
    queryFn: () =>
      fetchSourceAndUtilisation({
        projectId: args.projectId!,
        from: periodFromForDate(args.date),
        to: args.date,
      }),
    enabled: enabled && args.canUtilisation,
    staleTime: 15_000,
    retry: false,
  });

  const labelFor = (participantId: string) => {
    const hit = participantsQuery.data?.participants.find(
      (p) => p.id === participantId,
    );
    return hit?.participantLabel?.trim() || participantId;
  };

  const participantRows = aggregateParticipantFunding(
    commitmentsQuery.data?.items ?? [],
    labelFor,
  );

  return {
    cards: buildFundingCards(summaryQuery.data),
    participantRows,
    summary: summaryQuery.data,
    balances: balancesQuery.data,
    utilisation: utilisationQuery.data,
    summaryLoading: summaryQuery.isLoading || summaryQuery.isFetching,
    commitmentsLoading:
      commitmentsQuery.isLoading || commitmentsQuery.isFetching,
    utilisationLoading:
      utilisationQuery.isLoading || utilisationQuery.isFetching,
    summaryError: summaryQuery.error,
    commitmentsError: commitmentsQuery.error,
    utilisationError: utilisationQuery.error,
    balancesError: balancesQuery.error,
    refetchAll: () => {
      void summaryQuery.refetch();
      void commitmentsQuery.refetch();
      void participantsQuery.refetch();
      void balancesQuery.refetch();
      void utilisationQuery.refetch();
    },
  };
}
