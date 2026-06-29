export default {
  transform: { '^.+\\.ts?$': 'ts-jest' },
  clearMocks: true,
  collectCoverage: false,
  testMatch: ['**/tests/integration/*.test.ts'],
  testTimeout: 30000,
  setupFiles: ['./tests/integration/setup.ts'],
  runInBand: true,
}
