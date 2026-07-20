import { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import {
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { ErrorAlert } from '@/components/errors';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import type { PdfActionSource } from './types';
import { usePdfActions } from './usePdfActions';

export type DocumentActionMenuProps = {
  source: PdfActionSource;
  /**
   * Entity view permission already evaluated by the parent page
   * (e.g. `payment.view`, `purchase.view`, `grn.create`).
   */
  canViewEntity: boolean;
  /** Optional custom trigger label. */
  buttonLabel?: string;
  /** Use an icon button instead of a text button. */
  iconOnly?: boolean;
  disabled?: boolean;
};

/**
 * Reusable print / preview / download menu for backend-generated PDFs.
 * Hiding the menu is not enough — parents must keep route guards; this
 * component still checks `document.download` / `report.export` and surfaces 403.
 */
export function DocumentActionMenu({
  source,
  canViewEntity,
  buttonLabel = 'PDF',
  iconOnly = false,
  disabled = false,
}: DocumentActionMenuProps) {
  const { hasPermission } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const actions = usePdfActions({
    source,
    canViewEntity,
    canDocumentDownload: hasPermission('document.download'),
    canExportReport: hasPermission('report.export'),
  });

  const menuDisabled = disabled || !canViewEntity;

  const closeMenu = () => {
    setAnchor(null);
  };

  const trigger = iconOnly ? (
    <Tooltip title={actions.label}>
      <span>
        <IconButton
          size="small"
          aria-label={actions.label}
          disabled={menuDisabled || actions.loading}
          onClick={(e) => {
            setAnchor(e.currentTarget);
          }}
        >
          {actions.loading ? (
            <CircularProgress size={18} />
          ) : (
            <PictureAsPdfOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button
      size="small"
      variant="outlined"
      startIcon={
        actions.loading ? (
          <CircularProgress size={14} />
        ) : (
          <PictureAsPdfOutlinedIcon />
        )
      }
      endIcon={<MoreVertIcon />}
      disabled={menuDisabled || actions.loading}
      onClick={(e) => {
        setAnchor(e.currentTarget);
      }}
    >
      {buttonLabel}
    </Button>
  );

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      {trigger}

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions.unavailableReason ? (
          <MenuItem disabled>
            <ListItemText
              primary="PDF unavailable"
              secondary={actions.unavailableReason}
            />
          </MenuItem>
        ) : (
          <>
            <MenuItem
              onClick={() => {
                closeMenu();
                void actions.run('preview');
              }}
            >
              <ListItemIcon>
                <PictureAsPdfOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Preview</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                void actions.run('download');
              }}
            >
              <ListItemText>Download</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                void actions.run('print');
              }}
            >
              <ListItemText>Print</ListItemText>
            </MenuItem>
            {actions.canOfferRegenerate ? (
              <MenuItem
                onClick={() => {
                  closeMenu();
                  void actions.run('regenerate');
                }}
              >
                <ListItemText>Regenerate PDF</ListItemText>
              </MenuItem>
            ) : null}
          </>
        )}
      </Menu>

      {actions.error && !actions.previewOpen ? (
        <ErrorAlert error={actions.error} showDetails={false} />
      ) : null}

      <PdfPreviewDialog
        open={actions.previewOpen}
        title={actions.label}
        loading={actions.loading}
        error={actions.error}
        preview={actions.preview}
        onClose={() => {
          actions.setPreviewOpen(false);
        }}
        onRetry={() => {
          void actions.run('preview');
        }}
        onDownload={() => {
          void actions.run('download');
        }}
        onPrint={() => {
          void actions.run('print');
        }}
      />
    </Stack>
  );
}
