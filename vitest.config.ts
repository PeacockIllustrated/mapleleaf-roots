import { defineConfig } from 'vitest/config';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

loadDotenv({ path: '.env.test.local', quiet: true });
loadDotenv({ path: '.env.local', quiet: true });

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 30_000,
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
