import type { Options } from "./types";

import unplugin from ".";

export const unisonVue = (options: Options | undefined = {}): any => ({
  name: "unplugin-unison-vue",
  hooks: {
    "astro:config:setup": async (astro: any) => {
      astro.config.vite.plugins ||= [];
      astro.config.vite.plugins.push(
        unplugin.vite({
          ...options,
          module: options?.module ?? "@unisonjs/vue",
          signals: options?.signals ?? [
            "ref",
            "shallowRef",
            "reactive",
            "shallowReactive",
            "readonly",
          ],
        })
      );
    },
  },
});

export default (options: Options | undefined): any => ({
  name: "unplugin-unison",
  hooks: {
    "astro:config:setup": async (astro: any) => {
      astro.config.vite.plugins ||= [];
      astro.config.vite.plugins.push(unplugin.vite(options));
    },
  },
});
