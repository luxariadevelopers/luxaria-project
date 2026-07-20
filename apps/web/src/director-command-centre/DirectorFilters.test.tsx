import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { luxariaTheme } from '@/theme/theme';
import {
  DirectorFilters,
  toCommandCentreQuery,
  type DirectorFilterState,
} from './DirectorFilters';

describe('DirectorFilters', () => {
  it('maps filter state to API query (omits empty)', () => {
    const state: DirectorFilterState = {
      date: '2026-07-20',
      projectId: 'p1',
      directorId: '',
      financialYearId: 'fy1',
    };
    expect(toCommandCentreQuery(state)).toEqual({
      date: '2026-07-20',
      projectId: 'p1',
      financialYearId: 'fy1',
    });
  });

  it('changes project filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ThemeProvider theme={luxariaTheme}>
        <DirectorFilters
          value={{
            date: '2026-07-20',
            projectId: '',
            directorId: '',
            financialYearId: '',
          }}
          onChange={onChange}
          projects={[
            {
              id: 'p1',
              projectCode: 'PRJ-1',
              projectName: 'Tower A',
              status: 'Active',
            },
          ]}
          directors={[]}
          financialYears={[]}
          showDirectorFilter={false}
          showFinancialYearFilter={false}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByLabelText('Project'));
    await user.click(screen.getByRole('option', { name: /PRJ-1/ }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1' }),
    );
  });
});
