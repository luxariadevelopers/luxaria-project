const { randomUUID } = require('node:crypto');

jest.mock('expo-crypto', () => ({
  randomUUID: () => randomUUID(),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('@/utils/fileUpload', () => ({
  uploadToPresignedUrl: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    request: jest.fn(),
  },
  getErrorMessage: (error, fallback = 'Something went wrong') => {
    if (error instanceof Error) return error.message;
    return fallback;
  },
}));
