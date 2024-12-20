import { entries } from './scripts/aliases.js'
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: '"test"',
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __CJS__: true,
    __SSR__: true,
    __FEATURE_OPTIONS_API__: true,
    __FEATURE_SUSPENSE__: true,
    __FEATURE_PROD_DEVTOOLS__: false,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    __COMPAT__: true,
  },
  resolve: {
    alias: {
      "@vue-internals/shared": path.resolve(__dirname, "./vue/packages/shared/src"),
      "@vue-internals/reactivity": path.resolve(__dirname, "./vue/packages/reactivity/src"),
      "@vue-internals/runtime-core": path.resolve(__dirname, "./vue/packages/runtime-core/src"),
      ...entries
    }
  },
  test: {
    globals: true,
    setupFiles: 'scripts/setup-vitest.ts',
    environment: 'jsdom'
  },
})
