import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
  }),
  commonjs(),
];

export default [
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/index.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  },
];
