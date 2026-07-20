import { useMemo, useState } from 'react';
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  ApprovalHistoryAction,
  normalizeApprovalTimelineEntries,
} from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  StatusStrip,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { formatInr } from '@/format';
import {
  PurchaseOrderStatus,
  purchaseOrderStatusCatalog,
} from '@/status';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Dev-only entity detail layout demo (Micro Phase 015).
 * Not linked in the sidebar — open `/dev/entity-detail` directly.
 */
export function EntityDetailDemoPage() {
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState<string>(PurchaseOrderStatus.Draft);
  const [lastAction, setLastAction] = useState('');
  const [simulate, setSimulate] = useState<
    'ready' | 'loading' | 'error' | 'forbidden' | 'notFound' | 'noProject'
  >('ready');

  const canView =
    simulate !== 'forbidden' &&
    (hasPermission('purchase.view') || hasPermission('project.view'));

  const actions: EntityDetailAction[] = useMemo(
    () => [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'purchase.order',
        allowedStatuses: [
          PurchaseOrderStatus.Draft,
          PurchaseOrderStatus.Rejected,
        ],
        onClick: () => setLastAction('edit'),
      },
      {
        id: 'submit',
        label: 'Submit for approval',
        permission: 'purchase.order',
        allowedStatuses: [PurchaseOrderStatus.Draft],
        variant: 'contained',
        onClick: () => {
          setLastAction('submit');
          setStatus(PurchaseOrderStatus.PendingApproval);
        },
      },
      {
        id: 'approve',
        label: 'Approve',
        permission: 'purchase.approve',
        allowedStatuses: [PurchaseOrderStatus.PendingApproval],
        variant: 'contained',
        color: 'success',
        onClick: () => {
          setLastAction('approve');
          setStatus(PurchaseOrderStatus.Issued);
        },
      },
      {
        id: 'cancel',
        label: 'Cancel',
        permission: 'purchase.order',
        allowedStatuses: [
          PurchaseOrderStatus.Draft,
          PurchaseOrderStatus.PendingApproval,
          PurchaseOrderStatus.Issued,
        ],
        color: 'error',
        onClick: () => {
          setLastAction('cancel');
          setStatus(PurchaseOrderStatus.Cancelled);
        },
      },
    ],
    [],
  );

  const fixtureEvents = useMemo(
    () =>
      normalizeApprovalTimelineEntries(
        [
          {
            id: 'demo-sub',
            stepNumber: 1,
            action: ApprovalHistoryAction.Submitted,
            actorId: '',
            comment: null,
            metadata: { amount: 250000 },
            at: '2026-07-20T08:00:00.000Z',
          },
          {
            id: 'demo-ok',
            stepNumber: 1,
            action: ApprovalHistoryAction.Approved,
            actorId: 'u-demo',
            comment: 'Fixture approval',
            metadata: {
              fromStatus: 'pending_approval',
              toStatus: 'issued',
            },
            at: '2026-07-20T09:00:00.000Z',
          },
        ],
        { actorDirectory: { 'u-demo': 'Demo Approver' } },
      ),
    [],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        Entity detail layout
      </Typography>
      <Typography color="text.secondary">
        Shared IA for business records: header, status strip, action bar
        (permission + explicit status allow-list), summary, tabs, and timeline.
        Demo only — no API.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="demo-po-status">Workflow status</InputLabel>
          <Select
            labelId="demo-po-status"
            label="Workflow status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setLastAction('');
            }}
          >
            {purchaseOrderStatusCatalog.values.map((value) => (
              <MenuItem key={value} value={value}>
                {purchaseOrderStatusCatalog.label(value)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="demo-layout-state">Layout state</InputLabel>
          <Select
            labelId="demo-layout-state"
            label="Layout state"
            value={simulate}
            onChange={(e) =>
              setSimulate(
                e.target.value as typeof simulate,
              )
            }
          >
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="loading">Loading</MenuItem>
            <MenuItem value="error">Error / retry</MenuItem>
            <MenuItem value="forbidden">Permission denied</MenuItem>
            <MenuItem value="notFound">Not found</MenuItem>
            <MenuItem value="noProject">Project missing</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {lastAction ? (
        <Alert severity="info" variant="outlined">
          Last action: {lastAction} (demo only — no API call)
        </Alert>
      ) : null}

      <EntityDetailLayout
        canView={canView}
        projectReady={simulate !== 'noProject'}
        loading={simulate === 'loading'}
        error={
          simulate === 'error' ? new Error('Demo load failed') : undefined
        }
        onRetry={() => setSimulate('ready')}
        notFound={simulate === 'notFound'}
        permissionMessage="You need purchase.view (or project.view in this demo) to open the record."
        header={
          <DetailHeader
            title="Purchase order"
            code="PO-DEMO-001"
            subtitle="Fixture vendor · Coastal Cement Co"
            backTo="/dev/entity-detail"
            backLabel="Stay on demo"
          />
        }
        statusStrip={
          <StatusStrip
            status={status}
            domainKey="purchaseOrder"
            meta={`Editable: ${
              purchaseOrderStatusCatalog.isEditable(status) ? 'yes' : 'no'
            }`}
          />
        }
        actionBar={
          <EntityActionBar
            actions={actions}
            status={status}
            hasPermission={hasPermission}
          />
        }
        summary={
          <SummaryCards
            fields={[
              { id: 'vendor', label: 'Vendor', value: 'Coastal Cement Co' },
              { id: 'amount', label: 'Amount', value: formatInr(250000) },
              { id: 'project', label: 'Project', value: 'LUX-DEMO' },
            ]}
          />
        }
        tabs={
          <EntityDetailTabs
            hasPermission={hasPermission}
            tabs={[
              {
                id: 'lines',
                label: 'Lines',
                content: (
                  <Typography variant="body2" color="text.secondary">
                    Line items would render here on a real PO screen.
                  </Typography>
                ),
              },
              {
                id: 'documents',
                label: 'Documents',
                permission: 'document.view',
                content: (
                  <Typography variant="body2" color="text.secondary">
                    Document panel placeholder (requires document.view).
                  </Typography>
                ),
              },
            ]}
          />
        }
        timeline={
          <WorkflowTimeline
            title="History"
            events={fixtureEvents}
            canView={canView}
            statusDomainKey="purchaseOrder"
          />
        }
      />
    </Stack>
  );
}
