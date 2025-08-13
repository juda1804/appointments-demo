const path = require('path');

/** @type {import('jest').Config} */
const config = {
  displayName: 'ui',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: './',
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  moduleNameMapping: {
    '^@appointments-demo/utils$': path.resolve(__dirname, '../utils/src'),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      jsx: 'react-jsx',
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = config;