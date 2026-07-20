import { useMemo, useState } from 'react';
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate } from '@/format';
import { AttachSignatureDialog } from '@/material-issues/AttachSignatureDialog';
import {
  materialIssueStatusLabel,
  materialUnitLabel,
} from '@/material-issues/labels';
import { MaterialIssueStatusChip } from '@/material-issues/MaterialIssueStatusChip';
import { resolveMaterialIssueCapabilities } from '@/material-issues/roleAccess';
import { ReturnForm } from '@/material-issues/ReturnForm';
import { SignaturePreview } from '@/material-issues/SignaturePreview';
import { MaterialIssueStatus } from '@/material-issues/types';
import {
  useCancelMaterialIssue,
  useConfirmMaterialIssue,
  useMaterialIssueDetail,
  useSubmitMaterialIssue,
} from '@/material-issues/useMaterialIssues';
import { resolveMaterialIssueRowActions } from '@/material-issues/workflowActions';

/**
 * Material issue detail — `/inventory/material-issues/:issueId` (Micro Phase 073).
 */
export function MaterialIssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialIssueCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [returnOpen, setReturnOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useMaterialIssueDetail(
    issueId,
    canView && projectReady,
  );
  const issue = detailQuery.data;

  const submit = useSubmitMaterialIssue();
  const confirm = useConfirmMaterialIssue();
  const cancel = useCancelMaterialIssue();

  const allowed = issue
    ? resolveMaterialIssueRowActions(issue, caps)
    : [];

  const summaryFields = useMemo(() => {
    if (!issue) return [];
    return [
      {
        id: 'date',
        label: 'Issue date',
        value: formatDate(issue.issueDate),
      },
      {
        id: 'work',
        label: 'Work location',
        value: issue.workLocation,
      },
      {
        id: 'boq',
        label: 'BOQ item',
        value: issue.boqItemId,
      },
      {
        id: 'store',
        label: 'Store location',
        value: issue.storeLocation || '—',
      },
      {
        id: 'status',
        label: 'Status',
        value: materialIssueStatusLabel(issue.status),
      },
      {
        id: 'receiver',
        label: 'Received by',
        value: issue.receivedBy,
      },
    ];
  }, [issue]);

  const actions: EntityDetailAction[] = issue
    ? [
        {
          id: 'signature',
          label: 'Attach signature',
          permission: 'stock.issue',
          allowedStatuses: [MaterialIssueStatus.Draft],
          onClick: () => setSignatureOpen(true),
          disabled: !allowed.includes('attach_signature'),
        },
        {
          id: 'submit',
          label: 'Submit',
          permission: 'stock.issue',
          allowedStatuses: [MaterialIssueStatus.Draft],
          color: 'primary',
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(issue.id);
                success('Material issue submitted');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'confirm',
          label: 'Confirm (reduce stock)',
          permission: 'stock.adjust',
          allowedStatuses: [MaterialIssueStatus.Submitted],
          color: 'success',
          onClick: () => {
            void (async () => {
              try {
                await confirm.mutateAsync(issue.id);
                success('Material issue confirmed; stock reduced');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          disabled: !allowed.includes('confirm'),
        },
        {
          id: 'return',
          label: 'Return from work',
          permission: 'stock.issue',
          allowedStatuses: [MaterialIssueStatus.Confirmed],
          onClick: () => setReturnOpen(true),
          disabled: !allowed.includes('return'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'stock.issue',
          allowedStatuses: [
            MaterialIssueStatus.Draft,
            MaterialIssueStatus.Submitted,
          ],
          color: 'error',
          variant: 'outlined',
          onClick: () => {
            void (async () => {
              try {
                await cancel.mutateAsync(issue.id);
                success('Material issue cancelled');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Material issue unavailable"
        message="You need the stock.view permission to open material issues."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Material issue unavailable"
        message="The server denied access to this material issue (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !issue
        }
        permissionTitle="Material issue unavailable"
        permissionMessage="You need the stock.view permission to open material issues."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a material issue."
        notFoundTitle="Material issue not found"
        notFoundDescription="This issue may belong to another project, or the id is invalid."
        header={
          issue ? (
            <DetailHeader
              title={issue.issueNumber}
              subtitle="Material issue to work"
              backTo="/inventory/material-issues"
              backLabel="Material issues"
              meta={<MaterialIssueStatusChip status={issue.status} />}
            />
          ) : undefined
        }
        actionBar={
          issue ? (
            <EntityActionBar
              actions={actions}
              status={issue.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          issue ? <SummaryCards fields={summaryFields} /> : undefined
        }
        tabs={
          issue ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <Typography variant="body2" color="text.secondary">
                      {issue.notes?.trim() || 'No notes on this issue.'}
                    </Typography>
                  ),
                },
                {
                  id: 'items',
                  label: 'Items',
                  content: (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Material</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Remaining</TableCell>
                          <TableCell>Batch</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {issue.items.map((item) => (
                          <TableRow key={item.id || item.materialId}>
                            <TableCell>
                              {item.materialCode ?? item.materialId}
                              {item.materialName
                                ? ` · ${item.materialName}`
                                : ''}
                            </TableCell>
                            <TableCell align="right">
                              {item.quantity}
                            </TableCell>
                            <TableCell>
                              {materialUnitLabel(item.unit)}
                            </TableCell>
                            <TableCell align="right">
                              {item.remainingBaseQuantity}{' '}
                              {materialUnitLabel(item.baseUnit)}
                            </TableCell>
                            <TableCell>{item.batch ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ),
                },
                {
                  id: 'signatures',
                  label: 'Signatures',
                  content: (
                    <Stack spacing={2}>
                      <SignaturePreview
                        documentId={
                          issue.signatures.recipientSignatureDocumentId
                        }
                        checksum={
                          issue.signatures.recipientSignatureChecksum
                        }
                        label="Recipient signature"
                        canDownload={caps.canDownloadDocuments}
                      />
                      <SignaturePreview
                        documentId={
                          issue.signatures.issuerSignatureDocumentId
                        }
                        checksum={issue.signatures.issuerSignatureChecksum}
                        label="Issuer signature"
                        canDownload={caps.canDownloadDocuments}
                      />
                      {allowed.includes('attach_signature') ? (
                        <Button
                          variant="outlined"
                          onClick={() => setSignatureOpen(true)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Attach recipient signature
                        </Button>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'returns',
                  label: 'Returns',
                  content:
                    issue.returns.length === 0 ? (
                      <Typography color="text.secondary">
                        No returns posted
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {issue.returns.map((ret) => (
                          <Stack
                            key={ret.id || ret.returnNumber}
                            spacing={0.5}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 1.5,
                            }}
                          >
                            <Typography variant="subtitle2">
                              {ret.returnNumber} · {formatDate(ret.returnDate)}
                            </Typography>
                            {ret.items.map((item) => (
                              <Typography key={item.id} variant="body2">
                                {item.materialId}: {item.quantity}{' '}
                                {materialUnitLabel(item.unit)}
                                {item.reason ? ` — ${item.reason}` : ''}
                              </Typography>
                            ))}
                          </Stack>
                        ))}
                      </Stack>
                    ),
                },
              ]}
            />
          ) : undefined
        }
      />

      {issue ? (
        <>
          <ReturnForm
            open={returnOpen}
            onClose={() => setReturnOpen(false)}
            issue={issue}
            onReturned={() => void detailQuery.refetch()}
          />
          <AttachSignatureDialog
            open={signatureOpen}
            onClose={() => setSignatureOpen(false)}
            issue={issue}
            canUpload={caps.canUploadDocuments}
            canDownload={caps.canDownloadDocuments}
            onAttached={() => void detailQuery.refetch()}
          />
        </>
      ) : null}
    </>
  );
}
