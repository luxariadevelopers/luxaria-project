/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'mobile-logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      clearMocks: true,
    },
    {
      displayName: 'mobile-components',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^react-native$': '<rootDir>/test/mocks/react-native.js',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      clearMocks: true,
    },
  ],
};
