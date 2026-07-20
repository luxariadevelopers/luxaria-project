import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { CommandDialog } from './CommandDialog';
import type { QuickSearchHit } from './types';

const navigateMock = vi.fn();
const setSelectedProjectId = vi.fn();
const refetchMock = vi.fn();

const searchState = vi.hoisted(() => ({
  hasAnySearchPermission: true,
  belowMinLength: false,
  waitingForDebounce: false,
  isFetching: false,
  isError: false,
  hasSourceErrors: false,
  error: null as unknown,
  debouncedQuery: '',
  groups: [] as Array<{
    groupId: string;
    label: string;
    hits: QuickSearchHit[];
    errors: unknown[];
  }>,
  hits: [] as QuickSearchHit[],
  minLength: 2,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/context/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: '507f1f77bcf86cd799439011',
    selectedProject: null,
    setSelectedProjectId,
  }),
}));

vi.mock('./useQuickSearch', () => ({
  useQuickSearch: ({ query }: { query: string }) => {
    const trimmed = query.trim();
    return {
      ...searchState,
      belowMinLength: trimmed.length > 0 && trimmed.length < 2,
      debouncedQuery: trimmed,
      refetch: refetchMock,
    };
  },
}));

function hit(overrides: Partial<QuickSearchHit> = {}): QuickSearchHit {
  return {
    id: 'proj1',
    sourceId: 'projects',
    groupId: 'projects',
    title: 'Luxaria Heights',
    subtitle: 'PRJ-1',
    status: 'construction',
    path: '/projects',
    projectId: 'proj1',
    ...overrides,
  };
}

function renderDialog(open = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={luxariaTheme}>
        <CssBaseline />
        <MemoryRouter>
          <CommandDialog open={open} onClose={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('CommandDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState.hasAnySearchPermission = true;
    searchState.belowMinLength = false;
    searchState.waitingForDebounce = false;
    searchState.isFetching = false;
    searchState.isError = false;
    searchState.hasSourceErrors = false;
    searchState.error = null;
    searchState.groups = [];
    searchState.hits = [];
  });

  it('shows permission denied when no searchable modules are allowed', () => {
    searchState.hasAnySearchPermission = false;
    renderDialog();
    expect(screen.getByText('Search unavailable')).toBeInTheDocument();
  });

  it('prompts for minimum length before searching', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole('combobox'), 'a');
    expect(
      screen.getByText(/need 2 characters/i),
    ).toBeInTheDocument();
  });

  it('supports arrow + enter keyboard flow to open a hit', async () => {
    const user = userEvent.setup();
    const project = hit();
    const vendor = hit({
      id: 'ven1',
      sourceId: 'vendors',
      groupId: 'vendors',
      title: 'Steel House',
      subtitle: 'VEN-1',
      status: 'active',
      path: '/vendors?id=ven1',
      projectId: null,
    });
    searchState.hits = [project, vendor];
    searchState.groups = [
      {
        groupId: 'projects',
        label: 'Projects',
        hits: [project],
        errors: [],
      },
      {
        groupId: 'vendors',
        label: 'Vendors',
        hits: [vendor],
        errors: [],
      },
    ];

    renderDialog();
    await user.type(screen.getByRole('combobox'), 'st');

    expect(screen.getByText('Luxaria Heights')).toBeInTheDocument();
    expect(screen.getByText('Steel House')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/vendors?id=ven1', {
        state: { quickSearchHit: vendor },
      });
    });
    expect(setSelectedProjectId).not.toHaveBeenCalled();
  });

  it('activates project context when opening a project hit', async () => {
    const user = userEvent.setup();
    const project = hit();
    searchState.hits = [project];
    searchState.groups = [
      {
        groupId: 'projects',
        label: 'Projects',
        hits: [project],
        errors: [],
      },
    ];

    renderDialog();
    await user.type(screen.getByRole('combobox'), 'lu');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(setSelectedProjectId).toHaveBeenCalledWith('proj1');
      expect(navigateMock).toHaveBeenCalledWith('/projects', {
        state: { quickSearchHit: project },
      });
    });
  });
});
