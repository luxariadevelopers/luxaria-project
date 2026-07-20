import { SnackbarProvider, useSnackbar, type VariantType } from 'notistack';
import type { ReactNode } from 'react';

export function NotificationProvider({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {children}
    </SnackbarProvider>
  );
}

export function useNotify() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  return {
    notify: (message: string, variant: VariantType = 'default') =>
      enqueueSnackbar(message, { variant }),
    success: (message: string) => enqueueSnackbar(message, { variant: 'success' }),
    error: (message: string) => enqueueSnackbar(message, { variant: 'error' }),
    warning: (message: string) => enqueueSnackbar(message, { variant: 'warning' }),
    info: (message: string) => enqueueSnackbar(message, { variant: 'info' }),
    close: closeSnackbar,
  };
}
