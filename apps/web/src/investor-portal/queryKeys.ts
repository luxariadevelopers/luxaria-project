export const investorPortalQueryKeys = {
  root: ['investor-portal'] as const,
  documents: () => [...investorPortalQueryKeys.root, 'documents'] as const,
  statements: () => [...investorPortalQueryKeys.root, 'statements'] as const,
  bundle: () => [...investorPortalQueryKeys.root, 'bundle'] as const,
};
