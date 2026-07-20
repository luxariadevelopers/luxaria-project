import { useQuery } from '@tanstack/react-query';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { archiveDocument, listEntityDocuments } from '@/api/documents';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DocumentPreview } from './DocumentPreview';

type Props = {
  entityType: string;
  entityId: string;
  module?: string;
  projectId?: string;
  title?: string;
};

export function DocumentListPanel({
  entityType,
  entityId,
  module,
  projectId,
  title = 'Attached documents',
}: Props) {
  const { hasPermission } = useAuth();
  const { success, error: notifyError } = useNotify();
  const canView = hasPermission('document.view');
  const canArchive = hasPermission('document.archive');

  const query = useQuery({
    queryKey: ['documents', entityType, entityId, module, projectId],
    enabled: canView && Boolean(entityId),
    queryFn: async () => {
      const res = await listEntityDocuments({
        entityType,
        entityId,
        module,
        projectId,
        limit: 50,
      });
      return res.items;
    },
  });

  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="Missing permission document.view"
        showHomeLink={false}
      />
    );
  }

  if (query.error) {
    if (isForbiddenError(query.error)) {
      return <PermissionDenied error={query.error} showHomeLink={false} />;
    }
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
        forceRetry
      />
    );
  }

  const items = query.data ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        {query.isLoading ? (
          <Typography color="text.secondary">Loading documents…</Typography>
        ) : items.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Confirmed uploads for this entity will appear here."
          />
        ) : (
          <List dense>
            {items.map((doc: PublicDocument) => (
              <ListItem
                key={doc.id}
                alignItems="flex-start"
                secondaryAction={
                  canArchive && doc.status === 'active' ? (
                    <Button
                      size="small"
                      startIcon={<ArchiveOutlinedIcon />}
                      onClick={() => {
                        void (async () => {
                          try {
                            await archiveDocument(doc.id);
                            success('Document archived');
                            void query.refetch();
                          } catch (err) {
                            notifyError(
                              getErrorMessage(err, 'Archive failed'),
                            );
                          }
                        })();
                      }}
                    >
                      Archive
                    </Button>
                  ) : null
                }
              >
                <ListItemText
                  primary={<DocumentPreview document={doc} />}
                  secondary={`Type: ${doc.documentType}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Paper>
  );
}
