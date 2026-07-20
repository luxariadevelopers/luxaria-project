import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks in-app navigation and tab close when `when` is true (dirty form).
 * Render `UnsavedChangesDialog` with the returned blocker state.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => {
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    },
    reset: () => {
      if (blocker.state === 'blocked') {
        blocker.reset();
      }
    },
    blocker,
  };
}
