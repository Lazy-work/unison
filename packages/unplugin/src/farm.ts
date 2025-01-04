import { createFarmPlugin } from 'unplugin'
import { unpluginFactory } from '.'
import { Options } from './types';

export const unisonVue = createFarmPlugin((options: Options = {}, meta) =>
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
export default createFarmPlugin(unpluginFactory)
