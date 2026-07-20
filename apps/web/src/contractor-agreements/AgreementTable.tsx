import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { billingCycleLabel } from './labels';
import { AgreementStatusChip } from './AgreementStatusChip';
import type { ContractorAgreementCapabilities } from './roleAccess';
import type { PublicContractorAgreement } from './types';
import { resolveAgreementRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicContractorAgreement[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: ContractorAgreementCapabilities;
  contractorLabel: (contractorId: string) => string;
  onEdit?: (row: PublicContractorAgreement) => void;
  onSubmit?: (row: PublicContractorAgreement) => void;
  onApprove?: (row: PublicContractorAgreement) => void;
  onReject?: (row: PublicContractorAgreement) => void;
  onAmend?: (row: PublicContractorAgreement) => void;
  onTerminate?: (row: PublicContractorAgreement) => void;
  onAttachDocument?: (row: PublicContractorAgreement) => void;
  onOpenDetail?: (row: PublicContractorAgreement) => void;
};

export function AgreementTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  filterSlot,
  toolbarActions,
  caps,
  contractorLabel,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onAmend,
  onTerminate,
  onAttachDocument,
  onOpenDetail,
}: Props) {
  const columns: GridColDef<PublicContractorAgreement>[] = [
    {
      field: 'agreementNumber',
      headerName: 'Agreement',
      width: 150,
    },
    {
      field: 'version',
      headerName: 'Ver',
      width: 70,
      type: 'number',
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'agreedRates',
      headerName: 'Agreed value',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.agreedRates),
    },
    {
      field: 'manpowerCommitment',
      headerName: 'Manpower',
      width: 100,
      type: 'number',
    },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.startDate),
    },
    {
      field: 'endDate',
      headerName: 'End',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.endDate),
    },
    {
      field: 'billingCycle',
      headerName: 'Billing',
      width: 120,
      valueGetter: (_v, row) => billingCycleLabel(row.billingCycle),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <AgreementStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions = (
    row: PublicContractorAgreement,
  ): DataTableRowAction<PublicContractorAgreement>[] => {
    const ids = resolveAgreementRowActions(row, caps);
    const actions: DataTableRowAction<PublicContractorAgreement>[] = [];

    if (onOpenDetail) {
      actions.push({
        id: 'open',
        label: 'Open',
        onClick: () => onOpenDetail(row),
      });
    }

    if (ids.includes('edit') && onEdit) {
      actions.push({ id: 'edit', label: 'Edit', onClick: () => onEdit(row) });
    }
    if (ids.includes('submit') && onSubmit) {
      actions.push({
        id: 'submit',
        label: 'Submit',
        onClick: () => onSubmit(row),
      });
    }
    if (ids.includes('approve') && onApprove) {
      actions.push({
        id: 'approve',
        label: 'Approve',
        onClick: () => onApprove(row),
      });
    }
    if (ids.includes('reject') && onReject) {
      actions.push({
        id: 'reject',
        label: 'Reject',
        onClick: () => onReject(row),
      });
    }
    if (ids.includes('amend') && onAmend) {
      actions.push({ id: 'amend', label: 'Amend', onClick: () => onAmend(row) });
    }
    if (ids.includes('terminate') && onTerminate) {
      actions.push({
        id: 'terminate',
        label: 'Terminate',
        onClick: () => onTerminate(row),
      });
    }
    if (ids.includes('attach_document') && onAttachDocument) {
      actions.push({
        id: 'document',
        label: 'Document',
        onClick: () => onAttachDocument(row),
      });
    }

    return actions;
  };

  return (
    <DataTable
      title="Contractor agreements"
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search agreement number…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      getRowId={(row) => row.id}
      rowActions={rowActions}
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
      height={520}
      data-testid="agreement-table"
    />
  );
}
