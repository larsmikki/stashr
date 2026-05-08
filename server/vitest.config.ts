import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20000, // bcrypt operations and HTTP server setup can be slow
    include: ['src/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
