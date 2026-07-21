import type { PreviewDigestQuery } from './types';

export const directorDigestKeys = {
  all: ['director-digest'] as const,
  preview: (query: PreviewDigestQuery) =>
    [...directorDigestKeys.all, 'preview', query] as const,
  previewAll: (date?: string) =>
    [...directorDigestKeys.all, 'preview-all', date ?? 'default'] as const,
};
