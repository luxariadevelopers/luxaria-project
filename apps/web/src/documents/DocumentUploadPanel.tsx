import { useEffect, useRef, useState } from 'react';

import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  DOCUMENT_TYPE_REGEX,
  type DocumentUploadContext,
  type PublicDocument,
} from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { ALLOWED_DOCUMENT_MIME_TYPES } from '@/validation';
import {
  DocumentMetadataEditor,
  type DocumentMetadataValue,
} from './DocumentMetadataEditor';
import { DocumentPreview } from './DocumentPreview';
import { useDocumentUploadQueue } from './useDocumentUploadQueue';

export type DocumentUploadPanelProps = {
  context: DocumentUploadContext;
  title?: string;
  documentTypeOptions?: string[];
  /** When false, locks the type to `documentTypeOptions` / context.documentType. */
  allowCustomType?: boolean;
  /** Called whenever the set of confirmed document ids changes. */
  onConfirmedChange?: (documents: PublicDocument[]) => void;
  multiple?: boolean;
};

/**
 * Production upload panel: validate → presign → private S3 PUT → confirm.
 * Only confirmed (`active`) documents are exposed for record attachment.
 */
export function DocumentUploadPanel({
  context,
  title = 'Documents',
  documentTypeOptions,
  allowCustomType = true,
  onConfirmedChange,
  multiple = true,
}: DocumentUploadPanelProps) {
  const { hasPermission } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<DocumentMetadataValue>({
    documentType: context.documentType || 'attachment',
  });
  const queue = useDocumentUploadQueue({
    ...context,
    documentType: meta.documentType || context.documentType,
  });

  const canUpload = hasPermission('document.upload');
  const typeValid = DOCUMENT_TYPE_REGEX.test(meta.documentType);

  const confirmedKey = queue.confirmedIds.join(',');
  useEffect(() => {
    onConfirmedChange?.(queue.confirmedDocuments);
  }, [confirmedKey, onConfirmedChange, queue.confirmedDocuments]);


  if (!canUpload) {
    return (
      <PermissionDenied
        title="Upload not allowed"
        message="Missing permission document.upload"
        showHomeLink={false}
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          Private S3 upload. Files attach to the record only after confirm
          (`active`). MIME allowlist enforced; extension is derived server-side.
        </Typography>

        <DocumentMetadataEditor
          value={meta}
          onChange={setMeta}
          documentTypeOptions={documentTypeOptions}
          allowCustomType={allowCustomType}
        />

        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={multiple}
          accept={ALLOWED_DOCUMENT_MIME_TYPES.join(',')}
          onChange={(e) => {
            const list = e.target.files;
            if (!list?.length || !typeValid) return;
            queue.enqueueFiles(Array.from(list), meta.documentType);
            e.target.value = '';
          }}
        />

        <Button
          variant="contained"
          startIcon={<CloudUploadOutlinedIcon />}
          disabled={!typeValid}
          onClick={() => inputRef.current?.click()}
          sx={{ alignSelf: 'flex-start' }}
        >
          Select files
        </Button>

        {queue.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No files in the upload queue yet.
          </Typography>
        ) : (
          <List dense>
            {queue.items.map((item) => (
              <ListItem
                key={item.localId}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    {item.status === 'failed' ? (
                      <IconButton
                        edge="end"
                        aria-label="Retry upload"
                        onClick={() => queue.retry(item.localId)}
                      >
                        <ReplayOutlinedIcon />
                      </IconButton>
                    ) : null}
                    <IconButton
                      edge="end"
                      aria-label="Remove"
                      onClick={() => queue.remove(item.localId)}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={item.file.name}
                  secondary={
                    item.status === 'failed'
                      ? item.error
                      : item.status === 'confirmed'
                        ? `Confirmed · ${item.document?.id}`
                        : `${item.status}${item.status === 'uploading' ? ` · ${Math.round(item.progress * 100)}%` : ''}`
                  }
                  slotProps={{
                    secondary: {
                      color:
                        item.status === 'failed' ? 'error' : 'text.secondary',
                    },
                  }}
                />

                {item.status === 'uploading' ? (
                  <Box sx={{ width: 120, ml: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(item.progress * 100)}
                    />
                  </Box>
                ) : null}
              </ListItem>
            ))}
          </List>
        )}

        {queue.confirmedDocuments.length > 0 ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Confirmed attachments</Typography>
            {queue.confirmedDocuments.map((doc) => (
              <DocumentPreview key={doc.id} document={doc} />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
