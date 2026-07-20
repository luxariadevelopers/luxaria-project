import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { AccountBreadcrumbs } from './AccountBreadcrumbs';
import { AccountStatusChip } from './AccountStatusChip';
import { buildAccountBreadcrumbs, findTreeNode } from './hierarchy';
import {
  accountCategoryLabel,
  accountTypeLabel,
} from './labels';
import { resolveAccountControls } from './protectedControls';
import type { ChartOfAccountsCapabilities } from './roleAccess';
import type { AccountTreeNode, PublicAccount } from './types';
import {
  useActivateAccount,
  useDeactivateAccount,
  useDeleteAccount,
} from './useChartOfAccounts';

type Props = {
  open: boolean;
  account: PublicAccount | null;
  tree: readonly AccountTreeNode[];
  caps: ChartOfAccountsCapabilities;
  onClose: () => void;
  onEdit: (account: PublicAccount) => void;
  onAddChild: (parent: PublicAccount) => void;
  onSelectAccount: (accountId: string) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function AccountDetailDrawer({
  open,
  account,
  tree,
  caps,
  onClose,
  onEdit,
  onAddChild,
  onSelectAccount,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const activate = useActivateAccount();
  const deactivate = useDeactivateAccount();
  const remove = useDeleteAccount();

  if (!account) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}
      />
    );
  }

  const treeNode = findTreeNode(tree, account.id);
  const crumbs = buildAccountBreadcrumbs(tree, account.id);
  const controls = resolveAccountControls(account, treeNode);
  const busy =
    activate.isPending || deactivate.isPending || remove.isPending;

  const run = async (
    label: string,
    fn: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      await fn();
      success(label);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 460 } } },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="account-detail-drawer">
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">
              {account.accountCode} · {account.accountName}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <AccountStatusChip status={account.status} />
              {account.isSystem ? (
                <Typography variant="caption" color="warning.main">
                  System-seeded (protected)
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Hierarchy
            </Typography>
            <AccountBreadcrumbs
              path={crumbs}
              onSelect={(id) => {
                onSelectAccount(id);
              }}
            />
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            <DetailRow
              label="Type"
              value={accountTypeLabel(account.accountType)}
            />
            <DetailRow
              label="Category"
              value={accountCategoryLabel(account.accountCategory)}
            />
            <DetailRow label="Level" value={String(account.level)} />
            <DetailRow
              label="Postings"
              value={String(account.postingCount)}
            />
            <DetailRow
              label="Control account"
              value={account.isControlAccount ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Allow manual posting"
              value={account.allowManualPosting ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Requires project"
              value={account.requiresProject ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Requires party"
              value={account.requiresParty ? 'Yes' : 'No'}
            />
          </Stack>

          {controls.isProtectedSystem ? (
            <Alert severity="info">
              System accounts cannot be deleted and their account type cannot
              be changed. Other fields may still be updated when you have
              account.manage.
            </Alert>
          ) : null}

          {controls.deleteBlockedReason && caps.canManage ? (
            <Alert severity="warning">{controls.deleteBlockedReason}</Alert>
          ) : null}

          {controls.deactivateBlockedReason &&
          account.status === 'active' &&
          caps.canManage ? (
            <Alert severity="warning">
              {controls.deactivateBlockedReason}
            </Alert>
          ) : null}

          {caps.canManage ? (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() => onEdit(account)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => onAddChild(account)}
                >
                  Add child
                </Button>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                {account.status === 'inactive' ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void run('Account activated', () =>
                        activate.mutateAsync(account.id),
                      )
                    }
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    disabled={busy || !controls.canDeactivate}
                    onClick={() =>
                      void run('Account deactivated', () =>
                        deactivate.mutateAsync(account.id),
                      )
                    }
                  >
                    Deactivate
                  </Button>
                )}
                <Button
                  color="error"
                  disabled={busy || !controls.canDelete}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete ${account.accountCode}? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    void run('Account deleted', async () => {
                      await remove.mutateAsync(account.id);
                      onClose();
                    });
                  }}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Drawer>
  );
}
