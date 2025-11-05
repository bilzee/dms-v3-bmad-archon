const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/unit/delivery-offline.service.test.ts',
    '<rootDir>/tests/unit/verification/',
    '<rootDir>/tests/components/DeliveryConfirmationForm.test.tsx',
    '<rootDir>/tests/integration/delivery-confirmation.test.ts',
    '<rootDir>/tests/integration/verification/',
    '<rootDir>/tests/unit/delivery-media-validator.test.ts',
    '<rootDir>/tests/regression/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)