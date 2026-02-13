/**
 * Jest configuration for SEO Optimizer tests
 */

/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node environment for server-side testing
  testEnvironment: 'node',

  // Look for tests in the tests directory
  roots: ['<rootDir>/tests'],

  // Setup file runs before each test file
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Path aliases matching tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test file patterns
  testMatch: ['**/*.test.ts'],

  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        // Faster compilation for tests
        isolatedModules: true,
      },
    ],
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Entry point
    '!src/types/**', // Type definitions
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Coverage report formats
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Maximum workers for parallel execution
  maxWorkers: '50%',

  // Timeout for individual tests (30 seconds)
  testTimeout: 30000,

  // Global setup/teardown (if needed)
  // globalSetup: '<rootDir>/tests/globalSetup.ts',
  // globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Reporter configuration (default only, add jest-junit if installed)
  reporters: ['default'],

  // Snapshot serializers (if using snapshots)
  snapshotSerializers: [],

  // Watch plugins (uncomment if jest-watch-typeahead is installed)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],

  // Projects for different test types (optional)
  // projects: [
  //   {
  //     displayName: 'unit',
  //     testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  //   },
  //   {
  //     displayName: 'integration',
  //     testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  //   },
  //   {
  //     displayName: 'e2e',
  //     testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
  //   },
  // ],
};
