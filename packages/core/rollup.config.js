import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
// import esbuild from "rollup-plugin-esbuild";
// import path from "node:path";
// import { fileURLToPath } from "node:url";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

const plugins = [
  nodeResolve({
    extensions: ['.js', '.ts'],
    browser: true,
  }),
  replace({
    __DEV__: `!!(process.env.NODE_ENV !== 'production')`,
    __TEST__: `false`,
    __BROWSER__: `false`,
    __GLOBAL__: `false`,
    __ESM_BUNDLER__: `false`,
    __ESM_BROWSER__: `false`,
    __CJS__: `false`,
    __SSR__: `false`,
    __COMMIT__: 'undefined',
    __VERSION__: '3.5',
    __COMPAT__: `false`,

    // Feature flags
    __FEATURE_OPTIONS_API__: `false`,
    __FEATURE_PROD_DEVTOOLS__: `false`,
    __FEATURE_SUSPENSE__: `false`,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: `false`,
    preventAssignment: true,
  }),
  // esbuild({
  //   tsconfig: path.resolve(__dirname, "tsconfig.json"),
  //   sourceMap: true,
  //   target: "esnext"
  // }),
];

export default [
  {
    external: ['react'],
    input: 'src/index.js',
    output: [
      {
        file: 'dist/briddge-core.esm-bundler.js',
        format: 'es',
        sourcemap: false,
      },
      {
        file: 'dist/briddge-core.cjs.js',
        format: 'cjs',
        sourcemap: false,
      },
    ],
    plugins,
  },
];
