import { QueryClient } from '@tanstack/react-query';
import { clearProjectScopedCaches } from './ProjectContext';

describe('project switch cache invalidation', () => {
  it('invalidates project-scoped queries and preserves auth / project meta', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData(['auth', 'me'], { id: 'u1' });
    queryClient.setQueryData(['project-access', 'me'], {
      globalAccess: false,
      projectIds: ['p1'],
    });
    queryClient.setQueryData(['projects', 'selector'], [
      { id: 'p1', projectCode: 'LX-01', projectName: 'Alpha' },
    ]);
    queryClient.setQueryData(['daily-progress-reports', 'p1'], [{ id: 'd1' }]);
    queryClient.setQueryData(['goods-receipts', 'p1'], [{ id: 'g1' }]);

    await clearProjectScopedCaches(queryClient);

    const dprState = queryClient.getQueryState([
      'daily-progress-reports',
      'p1',
    ]);
    const grnState = queryClient.getQueryState(['goods-receipts', 'p1']);
    const authState = queryClient.getQueryState(['auth', 'me']);
    const accessState = queryClient.getQueryState(['project-access', 'me']);
    const selectorState = queryClient.getQueryState(['projects', 'selector']);

    expect(dprState?.isInvalidated).toBe(true);
    expect(grnState?.isInvalidated).toBe(true);
    expect(authState?.isInvalidated).toBe(false);
    expect(accessState?.isInvalidated).toBe(false);
    expect(selectorState?.isInvalidated).toBe(false);
  });
});
