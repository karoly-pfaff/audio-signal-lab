/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'vmThreads',
    include: ['sources/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./sources/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['sources/**/*.{ts,tsx}'],
      exclude: [
        'sources/**/*.test.{ts,tsx}',
        'sources/**/*.worker.ts',
        // These browser coordinators embed module-worker URLs. Their production behavior is
        // verified by build + Playwright because the V8 uncovered-file transform cannot safely
        // evaluate those URLs in every test runtime.
        'sources/components/analysis/SpectrogramDisplay.tsx',
        'sources/audio/bpmWorkerFactory.ts',
        'sources/store/analysisWorkerFactory.ts',
        'sources/hooks/spectrogramWorkerFactory.ts',
        'sources/test-setup.ts',
        'sources/types/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
