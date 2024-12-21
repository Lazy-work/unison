// for tests
declare namespace jest {
  interface Matchers<R, T> {
    toHaveBeenWarned(): R
    toHaveBeenWarnedLast(): R
    toHaveBeenWarnedTimes(n: number): R
  }
}

declare global {
  // Global compile-time constants
  var __DEV__: boolean
  var __TEST__: boolean
  var __BROWSER__: boolean
  var __GLOBAL__: boolean
  var __ESM_BUNDLER__: boolean
  var __ESM_BROWSER__: boolean
  var __CJS__: boolean
  var __SSR__: boolean
  var __COMMIT__: string
  var __VERSION__: string
  var __COMPAT__: boolean

  // Feature flags
  var __FEATURE_OPTIONS_API__: boolean
  var __FEATURE_PROD_DEVTOOLS__: boolean
  var __FEATURE_SUSPENSE__: boolean
  var __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: boolean
}

declare namespace React {
  export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    ReactCurrentOwner: {
      current: any
    }
  }
}
