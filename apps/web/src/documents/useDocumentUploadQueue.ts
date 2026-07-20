import { useCallback, useEffect, useRef, useState } from 'react';
import {
  executeDocumentUpload,
  type DocumentUploadContext,
  type LocalUploadFile,
  type PublicDocument,
} from '@luxaria/shared-types';
import { getErrorMessage } from '@/api/errors';
import { createWebUploadAdapters } from './createWebUploadAdapters';

export type QueueItemStatus =
  | 'queued'
  | 'uploading'
  | 'confirmed'
  | 'failed';

export type DocumentQueueItem = {
  localId: string;
  file: LocalUploadFile;
  documentType: string;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  document?: PublicDocument;
};

function toLocalFile(file: File): LocalUploadFile {
  return {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    source: file,
  };
}

/**
 * Client upload queue: only `confirmed` items expose document ids for record attach.
 */
export function useDocumentUploadQueue(context: DocumentUploadContext) {
  const [items, setItems] = useState<DocumentQueueItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const adapters = useRef(createWebUploadAdapters()).current;
  const pumping = useRef(false);
  const contextRef = useRef(context);
  contextRef.current = context;

  const pump = useCallback(async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      while (true) {
        const next = itemsRef.current.find((i) => i.status === 'queued');
        if (!next) break;

        setItems((prev) =>
          prev.map((item) =>
            item.localId === next.localId
              ? {
                  ...item,
                  status: 'uploading',
                  progress: 0,
                  error: undefined,
                }
              : item,
          ),
        );

        try {
          const document = await executeDocumentUpload(
            adapters,
            {
              ...contextRef.current,
              documentType: next.documentType,
            },
            next.file,
            (p) => {
              if (p.phase === 'uploading') {
                setItems((prev) =>
                  prev.map((item) =>
                    item.localId === next.localId
                      ? { ...item, progress: p.ratio }
                      : item,
                  ),
                );
              }
            },
          );
          setItems((prev) =>
            prev.map((item) =>
              item.localId === next.localId
                ? {
                    ...item,
                    status: 'confirmed',
                    progress: 1,
                    document,
                  }
                : item,
            ),
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((item) =>
              item.localId === next.localId
                ? {
                    ...item,
                    status: 'failed',
                    error: getErrorMessage(err, 'Upload failed'),
                  }
                : item,
            ),
          );
        }
      }
    } finally {
      pumping.current = false;
    }
  }, [adapters]);

  useEffect(() => {
    if (items.some((i) => i.status === 'queued')) {
      void pump();
    }
  }, [items, pump]);

  const enqueueFiles = useCallback((files: File[], documentType: string) => {
    const additions: DocumentQueueItem[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: toLocalFile(file),
      documentType,
      status: 'queued',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...additions]);
  }, []);

  const retry = useCallback((localId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.localId === localId && item.status === 'failed'
          ? { ...item, status: 'queued', error: undefined, progress: 0 }
          : item,
      ),
    );
  }, []);

  const remove = useCallback((localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  }, []);

  const confirmedDocuments = items
    .filter((i) => i.status === 'confirmed' && i.document)
    .map((i) => i.document as PublicDocument);

  return {
    items,
    enqueueFiles,
    retry,
    remove,
    confirmedDocuments,
    confirmedIds: confirmedDocuments.map((d) => d.id),
  };
}
