/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.e2e.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.spec.ts'],
  coverageDirectory: './coverage/e2e',
  testEnvironment: 'node',
  testTimeout: 180_000,
  displayName: 'backend-e2e',
  moduleNameMapper: {
    '^expo-server-sdk$': '<rootDir>/test/mocks/expo-server-sdk.ts',
  },
};
