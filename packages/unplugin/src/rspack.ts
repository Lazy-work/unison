import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from '.'
import { Options } from './types';

export const unisonVue = createRspackPlugin((options: Options = {}, meta) =>
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
export default createRspackPlugin(unpluginFactory)
