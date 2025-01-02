import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import esbuild from 'rollup-plugin-esbuild';
import InlineEnum from 'unplugin-inline-enum/rollup'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const entries = {
    "#vue-internals/reactivity": path.resolve(__dirname, "vue/packages/reactivity/src/"),
    "#vue-internals/runtime-core": path.resolve(__dirname,"vue/packages/runtime-core/src/"),
    "#vue-internals/shared": path.resolve(__dirname,"vue/packages/shared/src/"),
    "#vue/reactivity": path.resolve(__dirname,"vue/packages/reactivity/src/index.ts"),
    "#vue/runtime-core": path.resolve(__dirname,"vue/packages/runtime-core/src/index.ts"),
    "#vue/shared": path.resolve(__dirname,"vue/packages/shared/src/index.ts")
};
const plugins = [
  alias({
    entries,
  }),
  nodeResolve({
    extensions: ['.js', '.ts'],
    browser: true,
  }),
  // InlineEnum(),
  esbuild({
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    sourceMap: true,
    target: 'esnext',
  }),  
  replace({
    '__DEV__': `!!(process.env.NODE_ENV !== 'production')`,
    __TEST__:`false`,
    __BROWSER__:`false`,
    __GLOBAL__:`false`,
    __ESM_BUNDLER__:`false`,
    __ESM_BROWSER__:`false`,
    __CJS__:`false`,
    __SSR__:`false`,
    __COMMIT__: "undefined",
    __VERSION__: "3.5",
    __COMPAT__:`false`,

    // Feature flags
    __FEATURE_OPTIONS_API__:`false`,
    __FEATURE_PROD_DEVTOOLS__:`false`,
    __FEATURE_SUSPENSE__:`false`,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__:`false`,
    preventAssignment: true
  }),
];

export default [
  {
    external: ['react'],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins,
  },
];
