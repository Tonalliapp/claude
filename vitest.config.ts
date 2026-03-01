import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, 'src/config'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@websocket': path.resolve(__dirname, 'src/websocket'),
    },
  },
});
