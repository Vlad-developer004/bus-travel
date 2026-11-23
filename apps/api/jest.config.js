module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }] },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
