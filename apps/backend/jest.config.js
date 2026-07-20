/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['.*\\.integration\\.spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts'],
  coverageDirectory: '../coverage/unit',
  testEnvironment: 'node',
  testTimeout: 120_000,
  displayName: 'backend-unit',
  moduleNameMapper: {
    '^expo-server-sdk$': '<rootDir>/../test/mocks/expo-server-sdk.ts',
  },
};
