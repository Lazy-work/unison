import nodeResolve from "@rollup/plugin-node-resolve";
// import esbuild from "rollup-plugin-esbuild";
// import path from "node:path";
// import { fileURLToPath } from "node:url";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
    browser: true,
  }),
  // esbuild({
  //   tsconfig: path.resolve(__dirname, "tsconfig.json"),
  //   sourceMap: true,
  //   target: "esnext"
  // }),
];

export default [
  {
    external: ["react"],
    input: "src/index.js",
    output: [
      {
        file: "dist/briddge-core.esm-bundler.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/briddge-core.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  }
];
