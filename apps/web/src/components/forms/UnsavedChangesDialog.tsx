import { ConfirmDialog } from '@/components/ConfirmDialog';

export type UnsavedChangesDialogProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  title?: string;
  description?: string;
};

/**
 * Prompt when navigating away from a dirty form.
 * Pair with `useUnsavedChangesGuard`.
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  title = 'Discard unsaved changes?',
  description = 'You have unsaved changes. If you leave now, those changes will be lost.',
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      cancelLabel="Stay"
      confirmLabel="Leave"
      destructive
      onCancel={onStay}
      onConfirm={onLeave}
    />
  );
}
