import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: /node_modules/,
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    exclude: ['js-big-decimal'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    // e2e/ is Playwright's test directory, not Vitest's — both default to
    // *.spec.js, so without this Vitest tries (and fails) to run Playwright
    // test files through its own runner.
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
