import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/env.setup.js', './test/db.setup.js'],
    testTimeout: 20000,
    hookTimeout: 60000,
    // Run test files sequentially within a single worker — they share one
    // mongodb-memory-server instance via module-level state in db.setup.js,
    // so parallel workers would each try to start their own.
    pool: 'threads',
    singleThread: true,
  },
});
