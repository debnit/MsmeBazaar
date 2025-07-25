/** @type {import('jest').Config} */
module.exports = {
  // Test discovery
  roots: ['<rootDir>/apps', '<rootDir>/libs', '<rootDir>/client'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).+(ts|tsx|js|jsx)'
  ],
  
  // Module resolution and transformation
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Module name mapping for aliases
  moduleNameMapper: {
    // Root alias for current context
    '^@/(.*)$': '<rootDir>/client/src/$1',
    
    // Shared libraries
    '^@msmebazaar/ui/(.*)$': '<rootDir>/libs/ui/src/$1',
    '^@msmebazaar/ui$': '<rootDir>/libs/ui/src/index.ts',
    '^@msmebazaar/auth/(.*)$': '<rootDir>/libs/auth/src/$1',
    '^@msmebazaar/auth$': '<rootDir>/libs/auth/src/index.ts',
    '^@msmebazaar/api/(.*)$': '<rootDir>/libs/api/src/$1',
    '^@msmebazaar/api$': '<rootDir>/libs/api/src/index.ts',
    '^@msmebazaar/core/(.*)$': '<rootDir>/libs/core/src/$1',
    '^@msmebazaar/core$': '<rootDir>/libs/core/src/index.ts',
    '^@msmebazaar/hooks/(.*)$': '<rootDir>/libs/hooks/src/$1',
    '^@msmebazaar/hooks$': '<rootDir>/libs/hooks/src/index.ts',
    '^@msmebazaar/utils/(.*)$': '<rootDir>/libs/utils/src/$1',
    '^@msmebazaar/utils$': '<rootDir>/libs/utils/src/index.ts',
    '^@msmebazaar/db/(.*)$': '<rootDir>/libs/db/src/$1',
    '^@msmebazaar/db$': '<rootDir>/libs/db/src/index.ts',
    '^@msmebazaar/shared/(.*)$': '<rootDir>/libs/shared/src/$1',
    '^@msmebazaar/shared$': '<rootDir>/libs/shared/src/index.ts',
    '^@msmebazaar/analytics-engine/(.*)$': '<rootDir>/libs/analytics-engine/src/$1',
    '^@msmebazaar/analytics-engine$': '<rootDir>/libs/analytics-engine/src/index.ts',
    
    // App-specific aliases
    '^@msmebazaar/web/(.*)$': '<rootDir>/apps/web/src/$1',
    '^@msmebazaar/web$': '<rootDir>/apps/web/src/index.ts',
    '^@msmebazaar/mobile/(.*)$': '<rootDir>/apps/mobile/src/$1',
    '^@msmebazaar/mobile$': '<rootDir>/apps/mobile/src/index.ts',
    
    // Legacy aliases for backward compatibility
    '^@components/(.*)$': '<rootDir>/client/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/client/src/pages/$1',
    '^@lib/(.*)$': '<rootDir>/client/src/lib/$1',
    '^@hooks/(.*)$': '<rootDir>/client/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/client/src/utils/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@assets/(.*)$': '<rootDir>/attached_assets/$1',
    '^@types/(.*)$': '<rootDir>/client/src/types/$1',
    '^@styles/(.*)$': '<rootDir>/client/src/styles/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    
    // Static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx,js,jsx}',
    'libs/**/*.{ts,tsx,js,jsx}',
    'client/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
    '!**/*.stories.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**'
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/apps',
    '<rootDir>/libs',
    '<rootDir>/client/src'
  ],
  
  // Pass with no tests
  passWithNoTests: true,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Fail tests on console errors
  errorOnDeprecated: true,
  
  // Projects configuration for different workspaces
  projects: [
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/apps/web/jest.setup.js']
    },
    {
      displayName: 'mobile',
      testMatch: ['<rootDir>/apps/mobile/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      preset: 'jest-expo',
      setupFilesAfterEnv: ['<rootDir>/apps/mobile/jest.setup.js']
    },
    {
      displayName: 'libs',
      testMatch: ['<rootDir>/libs/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      testEnvironment: 'jsdom'
    }
  ]
};
