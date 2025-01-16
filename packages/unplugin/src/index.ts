import type { UnpluginFactory } from "unplugin";
import { createUnplugin } from "unplugin";
import type { BabelOptions, Options } from "./types";

// eslint-disable-next-line import/no-duplicates
import type * as babelCore from "@babel/core";
// eslint-disable-next-line import/no-duplicates
import type { ParserOptions } from "@babel/core";
import { createFilter, type ResolvedConfig } from "vite";
import { addRefreshWrapper, runtimePublicPath } from "./fast-refresh";
import path from "path";

// lazy load babel since it's not used during build if plugins are not used
let babel: typeof babelCore | undefined;
async function loadBabel() {
  if (!babel) {
    babel = await import("@babel/core");
  }
  return babel;
}

/**
 * The object type used by the `options` passed to plugins with
 * an `api.reactBabel` method.
 */
export interface ReactBabelOptions extends BabelOptions {
  plugins: Extract<BabelOptions["plugins"], any[]>;
  presets: Extract<BabelOptions["presets"], any[]>;
  overrides: Extract<BabelOptions["overrides"], any[]>;
  parserOpts: ParserOptions & {
    plugins: Extract<ParserOptions["plugins"], any[]>;
  };
}

type ReactBabelHook = (
  babelConfig: ReactBabelOptions,
  context: ReactBabelHookContext,
  config: ResolvedConfig
) => void;

type ReactBabelHookContext = { ssr: boolean; id: string };

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/;
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/;
const defaultIncludeRE = /\.[tj]sx?$/;
const tsRE = /\.tsx?$/;

export const unpluginFactory: UnpluginFactory<Options | undefined> = (
  opts = {}
) => {
  // Provide default values for Rollup compat.
  const filter = createFilter(opts.include ?? defaultIncludeRE, opts.exclude);
  const jsxImportSource = opts.jsxImportSource ?? "react";
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`;
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`;
  let isProduction = true;
  let projectRoot = process.cwd();
  let skipFastRefresh = false;
  let runPluginOverrides:
    | ((options: ReactBabelOptions, context: ReactBabelHookContext) => void)
    | undefined;

  let staticBabelOptions: ReactBabelOptions | undefined;

  // Support patterns like:
  // - import * as React from 'react';
  // - import React from 'react';
  // - import React, {useEffect} from 'react';
  const importReactRE = /\bimport\s+(?:\*\s+as\s+)?React\b/;
  return {
    name: "unplugin-unison",
    enforce: "pre",
    vite: {
      config: () => ({
        optimizeDeps: {
          exclude: ['vue', 'vue-demi', '@unisonjs/vue', '@unisonjs/core']
        }
      }),
      configResolved(config) {
        projectRoot = config.root;
        isProduction = config.isProduction;
        skipFastRefresh =
          isProduction ||
          config.command === "build" ||
          config.server.hmr === false;

        if ("jsxPure" in opts) {
          config.logger.warnOnce(
            "[@vitejs/plugin-react] jsxPure was removed. You can configure esbuild.jsxSideEffects directly."
          );
        }

        const hooks: ReactBabelHook[] = config.plugins
          .map((plugin) => plugin.api?.reactBabel)
          .filter(defined);

        if (hooks.length > 0) {
          runPluginOverrides = (babelOptions, context) => {
            hooks.forEach((hook) => hook(babelOptions, context, config as any));
          };
        } else if (typeof opts.babel !== "function") {
          // Because hooks and the callback option can mutate the Babel options
          // we only create static option in this case and re-create them
          // each time otherwise
          staticBabelOptions = createBabelOptions(opts.babel);
        }
      },
    },
    resolveId(source, importer, options) {
      if (source === "vue" || source === "vue-demi") {
        return path.resolve('node_modules/@unisonjs/vue/dist/esm/src/index.js');
      }
      return null;
    },
    async transform(code, id) {
      if (id.includes("/node_modules/")) return;

      const [filepath] = id.split("?");
      if (!filter(filepath)) return;

      const ssr = false;
      const babelOptions = (() => {
        if (staticBabelOptions) return staticBabelOptions;
        const newBabelOptions = createBabelOptions(
          typeof opts.babel === "function"
            ? opts.babel(id, { ssr })
            : opts.babel
        );
        runPluginOverrides?.(newBabelOptions, { id, ssr });
        return newBabelOptions;
      })();
      const plugins = [...babelOptions.plugins];
      if (opts?.compiler === undefined || !!opts.compiler) {
        plugins.push([
          await loadPlugin("babel-plugin-unisonjs-compiler"),
          {
            skipEnvCheck: true,
            signals: opts?.signals,
            module: opts?.module,
          },
        ]);
      }
      const isJSX = filepath.endsWith("x");
      const useFastRefresh =
        !skipFastRefresh &&
        !ssr &&
        (isJSX ||
          (opts.jsxRuntime === "classic"
            ? importReactRE.test(code)
            : code.includes(jsxImportDevRuntime) ||
              code.includes(jsxImportRuntime)));
      if (useFastRefresh) {
        if (opts?.fastRefresh === undefined || opts?.fastRefresh) {
          plugins.push([
            await loadPlugin("babel-plugin-unisonjs-fast-refresh"),
            {
              skipEnvCheck: true,
              signals: opts?.signals,
              module: opts?.module,
            },
          ]);
        }
      }

      // Avoid parsing if no special transformation is needed
      if (
        !plugins.length &&
        !babelOptions.presets.length &&
        !babelOptions.configFile &&
        !babelOptions.babelrc
      ) {
        return;
      }

      const parserPlugins = [...babelOptions.parserOpts.plugins];

      if (!filepath.endsWith(".ts")) {
        parserPlugins.push("jsx");
      }

      if (tsRE.test(filepath)) {
        parserPlugins.push("typescript");
      }

      const babel = await loadBabel();
      const result = await babel.transformAsync(code, {
        ...babelOptions,
        root: projectRoot,
        filename: id,
        sourceFileName: filepath,
        parserOpts: {
          ...babelOptions.parserOpts,
          sourceType: "module",
          allowAwaitOutsideFunction: true,
          plugins: parserPlugins,
        },
        generatorOpts: {
          ...babelOptions.generatorOpts,
          // import attributes parsing available without plugin since 7.26
          importAttributesKeyword: "with",
          decoratorsBeforeExport: true,
        },
        plugins,
        sourceMaps: true,
      });

      if (result) {
        let code = result.code!;
        if (useFastRefresh) {
          code = addRefreshWrapper(code);
        }

        return { code, map: result.map };
      }
    },
  };
};

const loadedPlugin = new Map<string, any>();
function loadPlugin(path: string): any {
  const cached = loadedPlugin.get(path);
  if (cached) return cached;

  const promise = import(path).then((module) => {
    const value = module.default || module;
    loadedPlugin.set(path, value);
    return value;
  });
  loadedPlugin.set(path, promise);
  return promise;
}

function createBabelOptions(rawOptions?: BabelOptions) {
  const babelOptions = {
    babelrc: false,
    configFile: false,
    ...rawOptions,
  } as ReactBabelOptions;

  babelOptions.plugins ||= [];
  babelOptions.presets ||= [];
  babelOptions.overrides ||= [];
  babelOptions.parserOpts ||= {} as any;
  babelOptions.parserOpts.plugins ||= [];

  return babelOptions;
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
