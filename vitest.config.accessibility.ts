import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve('src/main/'),
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src'),
      'electron': resolve('test/mocks/electron.ts'),
      '@electron-toolkit/utils': resolve('test/mocks/electron-toolkit-utils.ts')
    }
  },
  test: {
    name: 'accessibility',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/accessibility/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage/accessibility',
      include: [
        'src/renderer/src/**/*.{vue,ts,js}',
        'src/main/**/*.{ts,js}',
        'src/shared/**/*.{ts,js}'
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        'out/**',
        'test/**',
        '**/*.d.ts',
        'scripts/**',
        'build/**',
        '.vscode/**',
        '.git/**',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    include: ['test/accessibility/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'out/**'
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Accessibility tests may need more time for DOM manipulation and axe checks
    slowTestThreshold: 5000,
    
    // Browser-like environment for accessibility testing
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Prevent race conditions in DOM manipulation
      }
    }
  },
  
  // Configure for Vue and accessibility testing
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },
  
  // Optimize for testing
  optimizeDeps: {
    include: [
      'vue',
      '@vue/test-utils',
      'axe-core',
      'vitest-axe',
      '@testing-library/jest-dom',
      '@testing-library/vue'
    ]
  }
})