const { createJestConfig } = require('next/jest')

const createJestConfigWithDefaults = createJestConfig({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/web',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@msmebazaar/shared/(.*)$': '<rootDir>/libs/shared/src/$1',
    '^@msmebazaar/db/(.*)$': '<rootDir>/libs/db/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  projects: [
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/apps/web/jest.setup.js'],
      testEnvironment: 'jest-environment-jsdom',
    },
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/libs/shared/**/*.test.{js,ts}'],
      testEnvironment: 'jest-environment-node',
    },
    {
      displayName: 'db',
      testMatch: ['<rootDir>/libs/db/**/*.test.{js,ts}'],
      testEnvironment: 'jest-environment-node',
    },
  ],
  collectCoverageFrom: [
    'apps/**/*.{js,ts,tsx}',
    'libs/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfigWithDefaults(customJestConfig)