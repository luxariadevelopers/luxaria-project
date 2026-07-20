import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CommandDialog } from './CommandDialog';

type QuickSearchContextValue = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
};

const QuickSearchContext = createContext<QuickSearchContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}

/**
 * Global ⌘K / Ctrl+K quick search. Mount inside the authenticated app shell
 * (needs ProjectProvider + Router).
 */
export function QuickSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);
  const toggleSearch = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // `/` opens search when not typing in a field
      if (
        event.key === '/' &&
        !mod &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, openSearch, closeSearch, toggleSearch }),
    [open, openSearch, closeSearch, toggleSearch],
  );

  return (
    <QuickSearchContext.Provider value={value}>
      {children}
      <CommandDialog open={open} onClose={closeSearch} />
    </QuickSearchContext.Provider>
  );
}

export function useQuickSearchPalette(): QuickSearchContextValue {
  const ctx = useContext(QuickSearchContext);
  if (!ctx) {
    throw new Error(
      'useQuickSearchPalette must be used within QuickSearchProvider',
    );
  }
  return ctx;
}
