import { useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button } from '@mui/material';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { ExportDialog, tableCsvExportDescriptor } from '@/export';
import {
  isKnownPermission,
  type PermissionCode,
} from '@/navigation/permissionCatalog';

type Props<R extends GridValidRowModel> = {
  rows: R[];
  columns: GridColDef<R>[];
  fileName: string;
  permission?: string;
  disabled?: boolean;
};

/**
 * Opens the shared ExportDialog for client-side CSV with column selection.
 */
export function ExportButton<R extends GridValidRowModel>({
  rows,
  columns,
  fileName,
  permission,
  disabled,
}: Props<R>) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);

  const exportPermission: PermissionCode | undefined =
    permission && isKnownPermission(permission) ? permission : undefined;

  const descriptor = useMemo(
    () =>
      tableCsvExportDescriptor({
        rows,
        columns,
        fileName,
        permission: exportPermission,
      }),
    [rows, columns, fileName, exportPermission],
  );

  if (permission && !hasPermission(permission)) {
    return null;
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<FileDownloadOutlinedIcon />}
        disabled={disabled || rows.length === 0}
        onClick={() => {
          setOpen(true);
        }}
      >
        Export
      </Button>
      <ExportDialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        descriptor={descriptor}
      />
    </>
  );
}
