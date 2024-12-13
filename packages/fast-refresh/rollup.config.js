import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import { fileURLToPath } from "node:url";

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
        file: "dist/bridge-fast-refresh.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  },
];
