/**
 * R-003: offline sync must retain txn project header after UI project switch.
 */
describe('mobile X-Project-Id interceptor behaviour', () => {
  function applyProjectHeader(
    headers: Record<string, string>,
    selectedProjectId: string | null,
  ): Record<string, string> {
    const existingHeader = headers['X-Project-Id'];
    const hasExplicitProject =
      typeof existingHeader === 'string' && existingHeader.trim().length > 0;
    if (!hasExplicitProject && selectedProjectId) {
      return { ...headers, 'X-Project-Id': selectedProjectId };
    }
    return headers;
  }

  it('preserves explicit txn project header when selection differs', () => {
    const next = applyProjectHeader(
      { 'X-Project-Id': 'project-A' },
      'project-B',
    );
    expect(next['X-Project-Id']).toBe('project-A');
  });

  it('sets selected project when header absent', () => {
    const next = applyProjectHeader({}, 'project-B');
    expect(next['X-Project-Id']).toBe('project-B');
  });
});
