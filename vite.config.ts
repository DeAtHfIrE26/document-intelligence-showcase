import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/**/*.ts'], exclude: ['src/main.ts'] },
  },
});
