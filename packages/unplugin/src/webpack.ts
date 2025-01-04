import { createWebpackPlugin } from 'unplugin'
import { unpluginFactory } from '.'
import { Options } from './types';

export const unisonVue = createWebpackPlugin((options: Options = {}, meta) =>
  unpluginFactory(
    {
      ...options,
      module: options?.module ?? "@unisonjs/vue",
      signals: options?.signals ?? [
        "ref",
        "shallowRef",
        "reactive",
        "shallowReactive",
        "readonly",
      ],
    },
    meta
  )
);
export default createWebpackPlugin(unpluginFactory)
