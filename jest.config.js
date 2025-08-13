const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/web/',
});

// Custom Jest configuration
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
    '^@appointments-demo/types$': '<rootDir>/packages/types/src',
    '^@appointments-demo/utils$': '<rootDir>/packages/utils/src',
    '^@appointments-demo/ui$': '<rootDir>/packages/ui/src',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'apps/**/*.{js,jsx,ts,tsx}',
    'packages/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};

// Export the Jest config with Next.js settings
module.exports = createJestConfig(customJestConfig);